import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { WEB_CRYPTO_UNAVAILABLE_MESSAGE } from '../../../src/classes/aesEncryption.js';
import { BrantaClientOptions } from '../../../src/classes/brantaClientOptions.js';
import { BrantaServerBaseUrl } from '../../../src/enums/brantaServerBaseUrl.js';
import { DestinationType } from '../../../src/enums/destinationType.js';
import { BrantaPaymentException, BrantaPaymentExceptionReason } from '../../../src/exceptions/brantaPaymentException.js';
import { toNormalizedHash } from '../../../src/extensions/brantaExtensions.js';
import { PaymentBuilder } from '../../../src/v2/classes/paymentBuilder.js';
import { IAesEncryption } from '../../../src/v2/interfaces/iAesEncryption.js';
import { IBrantaClient } from '../../../src/v2/interfaces/iBrantaClient.js';
import { ISecretGenerator } from '../../../src/v2/interfaces/iSecretGenerator.js';
import { Payment } from '../../../src/v2/models/payment.js';
import { VerifyResult, VerifyStatus } from '../../../src/v2/models/verifyResult.js';
import { BrantaService } from '../../../src/v2/services/brantaService.js';

const expectMatch = (result: VerifyResult): Extract<VerifyResult, { status: 'match' }> => {
  expect(result.status).toBe(VerifyStatus.Match);
  if (result.status !== VerifyStatus.Match) throw new Error('expected match');
  return result;
};

const expectUnknown = (result: VerifyResult): void => {
  expect(result.status).toBe(VerifyStatus.Unknown);
};

const expectTampered = (result: VerifyResult): void => {
  expect(result.status).toBe(VerifyStatus.Tampered);
};

const BitcoinAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const EncryptedBitcoinAddress = 'encrypted-bitcoin-address';
const Secret = 'test-secret';
const brantaBitcoinLookup = (secret = Secret) =>
  `bitcoin:?branta_id=${encodeURIComponent(EncryptedBitcoinAddress)}&branta_secret=${encodeURIComponent(secret)}`;

const Bolt11Invoice = 'lnbc100n1ptest';
const EncryptedBolt11 = 'encrypted-bolt11-value';
const DecryptedBolt11 = 'lnbc100n1pdecrypted';

const ArkAddress = 'ark100testaddress';
const EncryptedArkAddress = 'encrypted-ark-address';

type GetPaymentsFn = (destinationValue: string, options?: BrantaClientOptions, signal?: AbortSignal) => Promise<Payment[]>;
type PostPaymentFn = (payment: Payment, options?: BrantaClientOptions, signal?: AbortSignal) => Promise<Payment | undefined>;
type IsApiKeyValidFn = (options?: BrantaClientOptions, signal?: AbortSignal) => Promise<boolean>;
type EncryptFn = (value: string, secret: string, deterministicNonce?: boolean) => Promise<string>;
type DecryptFn = (encryptedValue: string, secret: string) => Promise<string>;
type GenerateFn = () => string;

interface ClientMock extends IBrantaClient {
  getPayments: jest.Mock<GetPaymentsFn>;
  postPayment: jest.Mock<PostPaymentFn>;
  isApiKeyValid: jest.Mock<IsApiKeyValidFn>;
}

interface AesMock extends IAesEncryption {
  encrypt: jest.Mock<EncryptFn>;
  decrypt: jest.Mock<DecryptFn>;
}

interface SecretMock extends ISecretGenerator {
  generate: jest.Mock<GenerateFn>;
}

const makeClientMock = (): ClientMock => ({
  getPayments: jest.fn<GetPaymentsFn>().mockResolvedValue([]),
  postPayment: jest.fn<PostPaymentFn>().mockResolvedValue(undefined),
  isApiKeyValid: jest.fn<IsApiKeyValidFn>().mockResolvedValue(false),
});

const makeAesMock = (Bolt11Hash: string, ArkHash: string): AesMock => {
  const encrypt = jest.fn<EncryptFn>().mockImplementation(async (value, secret) => {
    if (value === Bolt11Invoice && secret === Bolt11Hash) return EncryptedBolt11;
    if (value === BitcoinAddress && secret === Secret) return EncryptedBitcoinAddress;
    if (value === ArkAddress && secret === ArkHash) return EncryptedArkAddress;
    return '';
  });
  const decrypt = jest.fn<DecryptFn>().mockImplementation(async (encryptedValue, secret) => {
    if (encryptedValue === EncryptedBitcoinAddress && secret === Secret) return BitcoinAddress;
    if (encryptedValue === EncryptedBolt11 && secret === Bolt11Hash) return DecryptedBolt11;
    return '';
  });
  return { encrypt, decrypt };
};

const makeSecretMock = (): SecretMock => {
  const generate = jest.fn<GenerateFn>().mockReturnValue(Secret);
  return { generate, deterministicNonce: false };
};

const plainBitcoinPayment = (): Payment => ({
  destinations: [{ value: BitcoinAddress, type: DestinationType.BitcoinAddress, isEncrypted: false }],
});

const encryptedBitcoinPayment = (): Payment =>
  new PaymentBuilder().addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress).build();

const encryptedBolt11Payment = (): Payment =>
  new PaymentBuilder().addDestination(EncryptedBolt11, DestinationType.Bolt11).build();

const plainBolt11Payment = (): Payment => ({
  destinations: [{ value: Bolt11Invoice, type: DestinationType.Bolt11, isEncrypted: false }],
});

const encryptedArkPayment = (): Payment =>
  new PaymentBuilder().addDestination(EncryptedArkAddress, DestinationType.ArkAddress).build();

describe('BrantaService', () => {
  let clientMock: ClientMock;
  let aesMock: AesMock;
  let secretMock: SecretMock;
  let defaultOptions: BrantaClientOptions;
  let service: BrantaService;
  let Bolt11Hash: string;
  let ArkHash: string;

  beforeAll(async () => {
    Bolt11Hash = await toNormalizedHash(Bolt11Invoice);
    ArkHash = await toNormalizedHash(ArkAddress);
  });

  beforeEach(() => {
    clientMock = makeClientMock();
    aesMock = makeAesMock(Bolt11Hash, ArkHash);
    secretMock = makeSecretMock();
    defaultOptions = {
      baseUrl: BrantaServerBaseUrl.Localhost,
      defaultApiKey: 'test-api-key',
    };
    service = new BrantaService(defaultOptions, {
      client: clientMock,
      aesEncryption: aesMock,
      secretGenerator: secretMock,
    });
  });

  // ===== verify =====

  describe('verify', () => {
    test('verify_bitcoinBrantaUri_usesBrantaParams', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      const { payments } = expectMatch(await service.verify(qrText));

      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBitcoinAddress, undefined, undefined);
      expect(payments[0]!.destinations[0]!.value).toBe(BitcoinAddress);
    });

    test('verify_bareBitcoinUri_returnsEmptyList', async () => {
      const result = await service.verify(`bitcoin:${BitcoinAddress}`);

      expectUnknown(result);
      expect(result.verifyUrl).toBe(`http://localhost:3000/v2/verify/${BitcoinAddress}`);
      expect(clientMock.getPayments).not.toHaveBeenCalled();
    });

    test('verify_lightningBolt11Uri_usesEncryptedInvoiceLookup', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [plainBolt11Payment()];
        return [];
      });

      await service.verify(`lightning:${Bolt11Invoice}`);

      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
    });

    test('verify_uppercaseLightningBolt11Uri_usesEncryptedInvoiceLookup', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [plainBolt11Payment()];
        return [];
      });

      await service.verify(`lightning:${Bolt11Invoice.toUpperCase()}`);

      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
    });

    test('verify_lightningBolt11Uri_leavesUnrelatedEncryptedBitcoinDestinationEncrypted', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [payment];
        return [];
      });

      const { payments } = expectMatch(await service.verify(`lightning:${Bolt11Invoice}`));

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(DecryptedBolt11);
      expect(payments[0]!.destinations[0]!.isEncrypted).toBe(false);
      expect(payments[0]!.destinations[1]!.value).toBe(EncryptedBitcoinAddress);
      expect(payments[0]!.destinations[1]!.isEncrypted).toBe(true);
    });

    test('verify_combinedBrantaQr_decryptsBothAddressAndInvoice', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .addDestination(EncryptedArkAddress, DestinationType.ArkAddress)
        .build();

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [payment];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}&lightning=${Bolt11Invoice}&ark=${ArkAddress}`;
      const { payments, verifyUrl } = expectMatch(await service.verify(qrText));

      const zkId = payment.destinations[0]!.zkId!;
      const bolt11ZkId = payment.destinations[1]!.zkId!;
      const arkZkId = payment.destinations[2]!.zkId!;
      expect(payments).toHaveLength(1);
      expect(verifyUrl).toBe(
        `http://localhost:3000/v2/verify/${EncryptedBitcoinAddress}#k-${zkId}=${Secret}&k-${bolt11ZkId}=${Bolt11Hash}&k-${arkZkId}=${ArkHash}`,
      );
      expect(payments[0]!.destinations[0]!.value).toBe(BitcoinAddress);
      expect(payments[0]!.destinations[1]!.value).toBe(DecryptedBolt11);
      expect(aesMock.decrypt).toHaveBeenCalledWith(EncryptedBitcoinAddress, Secret);
      expect(aesMock.decrypt).toHaveBeenCalledWith(EncryptedBolt11, Bolt11Hash);
    });
  });

  // ===== verify: QR address / decrypted address binding =====
  // A hit means every payable instruction in the QR decrypted to a destination on
  // the record. A decrypted address that differs from the QR is Tampered. A secret
  // or leg that does not decrypt is not a hit.

  describe('verify address binding', () => {
    const SwappedBitcoinAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
    const RegisteredBech32Address = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    const UppercaseBech32Qr = RegisteredBech32Address.toUpperCase();
    const EncryptedBech32Address = 'encrypted-bech32-address';
    const BaseAddressLower = '1a1zp1ep5qgefi2dmptftl5slmv7divfna';

    const encryptedBech32Payment = (): Payment =>
      new PaymentBuilder().addDestination(EncryptedBech32Address, DestinationType.BitcoinAddress).build();

    test('verify_bitcoinBrantaUri_swappedAddress_rejects', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${SwappedBitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      expectTampered(await service.verify(qrText));
    });

    test.each([
      ['tab', `bitcoi\tn:${SwappedBitcoinAddress}`],
      ['line feed', `bitcoi\nn:${SwappedBitcoinAddress}`],
      ['carriage return', `bitcoi\rn:${SwappedBitcoinAddress}`],
      ['leading control', `\x01bitcoin:${SwappedBitcoinAddress}`],
    ])('verify_bitcoinBrantaUri_controlCharInScheme_%s_swappedAddress_rejects', async (_label, uri) => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `${uri}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      expectTampered(await service.verify(qrText));
    });

    test('verify_bitcoinBrantaUri_matchingAddress_doesNotThrow', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;

      await expect(service.verify(qrText)).resolves.toMatchObject({
        status: VerifyStatus.Match,
        payments: [{ destinations: [{ value: BitcoinAddress }] }],
      });
    });

    test('verify_bitcoinBrantaUri_uppercaseBech32Qr_matchesLowercaseRegistered_doesNotThrow', async () => {
      aesMock.decrypt.mockImplementation(async (encryptedValue, secret) => {
        if (encryptedValue === EncryptedBech32Address && secret === Secret) return RegisteredBech32Address;
        return '';
      });
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBech32Address) return [encryptedBech32Payment()];
        return [];
      });

      const qrText = `bitcoin:${UppercaseBech32Qr}?branta_id=${EncryptedBech32Address}&branta_secret=${Secret}`;

      await expect(service.verify(qrText)).resolves.toMatchObject({
        status: VerifyStatus.Match,
        payments: [{ destinations: [{ value: RegisteredBech32Address }] }],
      });
    });

    test('verify_bitcoinBrantaUri_base58CaseMismatch_rejects', async () => {
      aesMock.decrypt.mockImplementation(async (encryptedValue, secret) => {
        if (encryptedValue === EncryptedBitcoinAddress && secret === Secret) return BitcoinAddress;
        return '';
      });
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      // Base58 is case-sensitive: a lowercased QR address must NOT be treated as a match.
      const qrText = `bitcoin:${BaseAddressLower}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      expectTampered(await service.verify(qrText));
    });

    test('verify_lightningQrWithBrantaParams_noOnChainAddress_decryptsWithoutComparison', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [payment];
        return [];
      });

      // branta_id/branta_secret here refer to the bolt11 lookup itself (lookupValue), and are
      // reused as the "encryptionKey" for any BitcoinAddress destination on the returned
      // payment too, matching existing lookupByBrantaId behavior — so the bitcoin destination
      // still decrypts successfully. No on-chain address is present in this QR
      // though, so there's nothing to compare the decrypted value against, and it must not throw.
      const qrText = `lightning:${Bolt11Invoice}?branta_id=${EncryptedBolt11}&branta_secret=${Secret}`;

      await expect(service.verify(qrText)).resolves.toMatchObject({
        status: VerifyStatus.Match,
        payments: [
          {
            destinations: [{ value: DecryptedBolt11 }, { value: BitcoinAddress, isEncrypted: false }],
          },
        ],
      });
    });

    test('verify_combinedBrantaQr_swappedAddress_rejects', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .addDestination(EncryptedArkAddress, DestinationType.ArkAddress)
        .build();

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [payment];
        return [];
      });

      const qrText = `bitcoin:${SwappedBitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}&lightning=${Bolt11Invoice}&ark=${ArkAddress}`;
      expectTampered(await service.verify(qrText));
    });

    test('verify_swappedAddressAndWrongSecret_returnsNoPayments', async () => {
      aesMock.decrypt.mockImplementation(async () => {
        throw new Error('auth tag mismatch');
      });
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${SwappedBitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=00000000-0000-4000-8000-000000000000`;
      const result = await service.verify(qrText);

      expectUnknown(result);
    });

    test('verify_attackerLightningLeg_returnsNoPayments', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}&lightning=lnbc1attacker`;
      const result = await service.verify(qrText);

      expectUnknown(result);
    });

    test('verify_attackerArkLeg_returnsNoPayments', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}&ark=ark1attacker`;
      const result = await service.verify(qrText);

      expectUnknown(result);
    });

    test('verify_bip321BcSwap_rejects', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:?bc=${SwappedBitcoinAddress}&branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      expectTampered(await service.verify(qrText));
    });

    test('verify_bip321BcMatch_resolves', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:?bc=${BitcoinAddress}&branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;

      await expect(service.verify(qrText)).resolves.toMatchObject({
        status: VerifyStatus.Match,
        payments: [{ destinations: [{ value: BitcoinAddress, isEncrypted: false }] }],
      });
    });

    test('verify_pathAndBcDisagree_rejectsBeforeLookup', async () => {
      const qrText = `bitcoin:${BitcoinAddress}?bc=${SwappedBitcoinAddress}&branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      expectTampered(await service.verify(qrText));
      expect(clientMock.getPayments).not.toHaveBeenCalled();
    });

    test('verify_payInstruction_returnsNoPayments', async () => {
      const qrText = `bitcoin:${BitcoinAddress}?pay=bitcoin:${SwappedBitcoinAddress}&branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      const result = await service.verify(qrText);

      expectUnknown(result);
      expect(clientMock.getPayments).not.toHaveBeenCalled();
    });

    test('verify_lnoInstruction_returnsNoPayments', async () => {
      const qrText = `bitcoin:${BitcoinAddress}?lno=lno1qqattacker&branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      const result = await service.verify(qrText);

      expectUnknown(result);
      expect(clientMock.getPayments).not.toHaveBeenCalled();
    });

    test('verify_noPayableInstruction_wrongSecret_returnsEncryptedRecord', async () => {
      aesMock.decrypt.mockImplementation(async () => {
        throw new Error('auth tag mismatch');
      });
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:?branta_id=${EncryptedBitcoinAddress}&branta_secret=00000000-0000-4000-8000-000000000000`;
      const { payments } = expectMatch(await service.verify(qrText));

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]).toMatchObject({
        value: EncryptedBitcoinAddress,
        isEncrypted: true,
      });
    });
  });

  describe('verify crypto unavailable', () => {
    test('verify_bitcoinBrantaUri_cryptoUnavailable_throwsCryptoUnavailableException', async () => {
      aesMock.decrypt.mockImplementation(async () => {
        throw new Error(WEB_CRYPTO_UNAVAILABLE_MESSAGE);
      });
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      const promise = service.verify(qrText);

      await expect(promise).rejects.toThrow(BrantaPaymentException);
      await expect(promise).rejects.toMatchObject({ reason: BrantaPaymentExceptionReason.CryptoUnavailable });
    });

    test('verify_bolt11Destination_cryptoUnavailable_throwsCryptoUnavailableException', async () => {
      const payment = new PaymentBuilder().addDestination(EncryptedBolt11, DestinationType.Bolt11).build();

      aesMock.decrypt.mockImplementation(async (encryptedValue, secret) => {
        if (encryptedValue === EncryptedBolt11 && secret === Bolt11Hash) {
          throw new Error(WEB_CRYPTO_UNAVAILABLE_MESSAGE);
        }
        return '';
      });
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [payment];
        return [];
      });

      const qrText = `lightning:${Bolt11Invoice}?branta_id=${EncryptedBolt11}&branta_secret=${Secret}`;
      const promise = service.verify(qrText);

      await expect(promise).rejects.toThrow(BrantaPaymentException);
      await expect(promise).rejects.toMatchObject({ reason: BrantaPaymentExceptionReason.CryptoUnavailable });
    });

    test('verify_bitcoinBrantaUri_wrongKey_returnsNoPayments', async () => {
      // The address in the QR was not bound. A wrong key must not come back as a verified card.
      aesMock.decrypt.mockImplementation(async () => {
        throw new Error('OperationError: the operation failed for an operation-specific reason.');
      });
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [encryptedBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      const result = await service.verify(qrText);

      expectUnknown(result);
    });
  });

  // ===== verify paste (same method as QR scan) =====

  describe('verify paste', () => {
    test('verify_bareBitcoinAddress_returnsEmpty', async () => {
      expectUnknown(await service.verify(BitcoinAddress));
      expect(clientMock.getPayments).not.toHaveBeenCalled();
    });

    test.each(['tb1qtestaddress', 'bcrt1qtestaddress'])(
      'verify_testnetBech32_%s_returnsEmpty',
      async (address) => {
        expectUnknown(await service.verify(address));
        expect(clientMock.getPayments).not.toHaveBeenCalled();
      },
    );

    test('verify_unknownValue_returnsEmpty', async () => {
      expectUnknown(await service.verify('not-a-bolt11-value'));
      expect(clientMock.getPayments).not.toHaveBeenCalled();
    });

    test('verify_lookupTokenWithoutUri_returnsEmpty', async () => {
      expectUnknown(await service.verify(EncryptedBitcoinAddress));
      expect(clientMock.getPayments).not.toHaveBeenCalled();
    });

    test('verify_shouldReturnEmptyList_whenClientReturnsEmpty', async () => {
      clientMock.getPayments.mockResolvedValue([]);

      const result = await service.verify(brantaBitcoinLookup());

      expectUnknown(result);
      expect(result.verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBitcoinAddress}`);
    });

    test('verify_shouldForwardOptions_toClient', async () => {
      clientMock.getPayments.mockResolvedValue([encryptedBitcoinPayment()]);

      await service.verify(brantaBitcoinLookup(), defaultOptions);

      expect(clientMock.getPayments).toHaveBeenCalledWith(expect.any(String), defaultOptions, undefined);
    });

    test('verify_shouldForwardAbortSignal_toClient', async () => {
      const controller = new AbortController();
      clientMock.getPayments.mockResolvedValue([]);

      await service.verify(brantaBitcoinLookup(), undefined, controller.signal);

      expect(clientMock.getPayments).toHaveBeenCalledWith(expect.any(String), undefined, controller.signal);
    });

    test('verify_bitcoinBrantaUri_decryptsDestinationValue', async () => {
      clientMock.getPayments.mockResolvedValue([encryptedBitcoinPayment()]);

      const { payments } = expectMatch(await service.verify(brantaBitcoinLookup()));

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(BitcoinAddress);
      expect(aesMock.decrypt).toHaveBeenCalledWith(EncryptedBitcoinAddress, Secret);
    });

    test('verify_bitcoinBrantaUri_wrongKey_leavesEncrypted', async () => {
      clientMock.getPayments.mockResolvedValue([encryptedBitcoinPayment()]);
      aesMock.decrypt.mockImplementationOnce(async () => {
        throw new Error('Decryption failed: auth tag mismatch');
      });

      const { payments } = expectMatch(await service.verify(brantaBitcoinLookup('wrong-key')));

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(EncryptedBitcoinAddress);
      expect(payments[0]!.destinations[0]!.isEncrypted).toBe(true);
    });

    test('verify_unencryptedDestination_doesNotDecrypt', async () => {
      clientMock.getPayments.mockResolvedValue([plainBitcoinPayment()]);

      const { payments } = expectMatch(await service.verify(brantaBitcoinLookup()));

      expect(payments[0]!.destinations[0]!.value).toBe(BitcoinAddress);
      expect(aesMock.decrypt).not.toHaveBeenCalled();
    });

    test('verify_pastedBolt11_decryptsUsingHash', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [encryptedBolt11Payment()];
        return [];
      });

      const { payments } = expectMatch(await service.verify(Bolt11Invoice));

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(DecryptedBolt11);
      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
      expect(aesMock.decrypt).toHaveBeenCalledWith(EncryptedBolt11, Bolt11Hash);
    });

    test('verify_unencryptedBolt11_doesNotDecrypt', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [plainBolt11Payment()];
        return [];
      });

      const { payments } = expectMatch(await service.verify(Bolt11Invoice));

      expect(payments[0]!.destinations[0]!.value).toBe(Bolt11Invoice);
      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
      expect(aesMock.decrypt).not.toHaveBeenCalled();
    });

    test('verify_unencryptedBolt11_setsVerifyUrl', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [plainBolt11Payment()];
        return [];
      });

      const { verifyUrl } = expectMatch(await service.verify(Bolt11Invoice));

      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBolt11}`);
    });

    test('verify_bitcoinBrantaUri_setsVerifyUrlWithKeyFragment', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [payment];
        return [];
      });

      const { verifyUrl } = expectMatch(await service.verify(brantaBitcoinLookup()));

      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBitcoinAddress}#k-${zkId}=${Secret}`);
    });

    test('verify_zkBolt11_setsVerifyUrlWithKeyFragment', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [payment];
        return [];
      });

      const { verifyUrl } = expectMatch(await service.verify(Bolt11Invoice));

      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBolt11}#k-${zkId}=${Bolt11Hash}`);
    });

    test('verify_bolt11NotFound_doesNotLookUpRawInvoice', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [];
        if (lookup === Bolt11Invoice) return [plainBolt11Payment()];
        return [];
      });

      const result = await service.verify(Bolt11Invoice);

      expectUnknown(result);
      expect(result.verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBolt11}`);
      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
      expect(clientMock.getPayments).not.toHaveBeenCalledWith(Bolt11Invoice, undefined, undefined);
    });
  });

  // ===== addPayment =====

  describe('addPayment', () => {
    test('addPayment_bitcoinAddressWithoutType_encryptsWithSecretAndSetsType', async () => {
      const payment = new PaymentBuilder().addDestination(BitcoinAddress).build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      await service.addPayment(payment);

      expect(aesMock.encrypt).toHaveBeenCalledWith(BitcoinAddress, Secret, false);
      expect(payment.destinations[0]!.type).toBe(DestinationType.BitcoinAddress);
      expect(payment.destinations[0]!.value).toBe(EncryptedBitcoinAddress);
    });

    test('addPayment_bolt11WithoutType_encryptsWithHash', async () => {
      const payment = new PaymentBuilder().addDestination(Bolt11Invoice).build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .build();
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      await service.addPayment(payment);

      expect(aesMock.encrypt).toHaveBeenCalledWith(Bolt11Invoice, Bolt11Hash, true);
      expect(payment.destinations[0]!.value).toBe(EncryptedBolt11);
    });

    test('addPayment_encryptsBitcoinAddressWithSecret', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      const { secret } = await service.addPayment(payment);

      expect(aesMock.encrypt).toHaveBeenCalledWith(BitcoinAddress, Secret, false);
      expect(secret).toBe(Secret);
      expect(payment.destinations[0]!.value).toBe(EncryptedBitcoinAddress);
    });

    test('addPayment_zkBolt11_encryptsWithHash', async () => {
      const payment = new PaymentBuilder()
        .addDestination(Bolt11Invoice, DestinationType.Bolt11)
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .build();
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      await service.addPayment(payment);

      expect(aesMock.encrypt).toHaveBeenCalledWith(Bolt11Invoice, Bolt11Hash, true);
      expect(payment.destinations[0]!.value).toBe(EncryptedBolt11);
    });

    test('addPayment_zkArkAddress_encryptsWithHash', async () => {
      const payment = new PaymentBuilder()
        .addDestination(ArkAddress, DestinationType.ArkAddress)
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedArkAddress, DestinationType.ArkAddress)
        .build();
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      await service.addPayment(payment);

      expect(aesMock.encrypt).toHaveBeenCalledWith(ArkAddress, ArkHash, true);
      expect(payment.destinations[0]!.value).toBe(EncryptedArkAddress);
    });

    test('addPayment_zkBitcoinAddress_setsVerifyUrlWithKeyFragment', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      const { verifyUrl } = await service.addPayment(payment);

      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBitcoinAddress}#k-${zkId}=${Secret}`);
    });

    test('addPayment_returnsGeneratedSecret', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .build();

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.zkId = payment.destinations[0]!.zkId!;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      const { secret } = await service.addPayment(payment);

      expect(secret).toBe(Secret);
    });

    test('addPayment_unsupportedType_throws', async () => {
      const payment = new PaymentBuilder()
        .addDestination('not-a-payable-destination')
        .build();

      await expect(service.addPayment(payment)).rejects.toThrow(BrantaPaymentException);
      expect(clientMock.postPayment).not.toHaveBeenCalled();
    });
  });

  // ===== isApiKeyValid =====

  describe('isApiKeyValid', () => {
    test('isApiKeyValid_returnsTrue_whenClientReturnsTrue', async () => {
      clientMock.isApiKeyValid.mockResolvedValue(true);

      const result = await service.isApiKeyValid();

      expect(result).toBe(true);
    });

    test('isApiKeyValid_returnsFalse_whenClientReturnsFalse', async () => {
      clientMock.isApiKeyValid.mockResolvedValue(false);

      const result = await service.isApiKeyValid();

      expect(result).toBe(false);
    });

    test('isApiKeyValid_forwardsOptions_toClient', async () => {
      clientMock.isApiKeyValid.mockResolvedValue(true);

      await service.isApiKeyValid(defaultOptions);

      expect(clientMock.isApiKeyValid).toHaveBeenCalledWith(defaultOptions, undefined);
    });

    test('isApiKeyValid_forwardsAbortSignal_toClient', async () => {
      const controller = new AbortController();
      clientMock.isApiKeyValid.mockResolvedValue(true);

      await service.isApiKeyValid(undefined, controller.signal);

      expect(clientMock.isApiKeyValid).toHaveBeenCalledWith(undefined, controller.signal);
    });
  });

  // ===== Metadata Encryption (DEK Envelope) =====

  describe('metadata encryption (DEK envelope)', () => {
    const Dek = 'test-dek';
    const EncryptedDek = 'encrypted-dek-value';
    const Metadata = '{"email":"alice@example.com"}';
    const EncryptedMetadata = 'encrypted-metadata-value';

    // addPayment

    test('addPayment_withMetadataAndBitcoinDestination_encryptsMetadataWithDekAndSetsDek', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      payment.metadata = Metadata;
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);
      secretMock.generate.mockReturnValueOnce(Dek).mockReturnValueOnce(Secret);
      aesMock.encrypt.mockImplementation(async (value, key) => {
        if (value === Metadata && key === Dek) return EncryptedMetadata;
        if (value === BitcoinAddress && key === Secret) return EncryptedBitcoinAddress;
        if (value === Dek && key === Secret) return EncryptedDek;
        return '';
      });

      await service.addPayment(payment);

      expect(payment.metadata).toBe(EncryptedMetadata);
      expect(payment.destinations[0]!.encryptedDek).toBe(EncryptedDek);
      expect(aesMock.encrypt).toHaveBeenCalledWith(Metadata, Dek, false);
      expect(aesMock.encrypt).toHaveBeenCalledWith(Dek, Secret, false);
    });

    test('addPayment_withMetadata_encryptsMetadataWithDek', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      payment.metadata = Metadata;
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);
      secretMock.generate.mockReturnValueOnce(Dek).mockReturnValueOnce(Secret);
      aesMock.encrypt.mockImplementation(async (value, key) => {
        if (value === Metadata && key === Dek) return EncryptedMetadata;
        if (value === BitcoinAddress && key === Secret) return EncryptedBitcoinAddress;
        if (value === Dek && key === Secret) return EncryptedDek;
        return '';
      });

      await service.addPayment(payment);

      expect(payment.metadata).toBe(EncryptedMetadata);
      expect(payment.destinations[0]!.encryptedDek).toBe(EncryptedDek);
      expect(secretMock.generate).toHaveBeenCalledTimes(2);
    });

    test('addPayment_withDestinationAndNoMetadata_doesNotGenerateDek', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);
      aesMock.encrypt.mockImplementation(async (value, key) => {
        if (value === BitcoinAddress && key === Secret) return EncryptedBitcoinAddress;
        return '';
      });

      await service.addPayment(payment);

      expect(secretMock.generate).toHaveBeenCalledTimes(1);
      expect(payment.destinations[0]!.encryptedDek).toBeUndefined();
    });

    // decryptDestinations

    test('verify_encryptedBitcoinWithEncryptedDek_decryptsMetadataViaDek', async () => {
      const payment: Payment = {
        destinations: [{ value: EncryptedBitcoinAddress, type: DestinationType.BitcoinAddress, encryptedDek: EncryptedDek }],
        metadata: EncryptedMetadata,
      };

      clientMock.getPayments.mockResolvedValue([payment]);
      aesMock.decrypt.mockImplementation(async (encryptedValue, key) => {
        if (encryptedValue === EncryptedBitcoinAddress && key === Secret) return BitcoinAddress;
        if (encryptedValue === EncryptedDek && key === Secret) return Dek;
        if (encryptedValue === EncryptedMetadata && key === Dek) return Metadata;
        throw new Error(`unexpected: decrypt(${encryptedValue}, ${key})`);
      });

      const { payments } = expectMatch(await service.verify(brantaBitcoinLookup()));

      expect(payments[0]!.metadata).toBe(Metadata);
      expect(payments[0]!.isMetadataDecrypted).toBe(true);
    });

    test('verify_encryptedBolt11WithEncryptedDek_decryptsMetadataViaHashKey', async () => {
      const payment: Payment = {
        destinations: [{ value: EncryptedBolt11, type: DestinationType.Bolt11, encryptedDek: EncryptedDek }],
        metadata: EncryptedMetadata,
      };

      clientMock.getPayments.mockImplementation(async (lookup) => {
        if (lookup === EncryptedBolt11) return [payment];
        return [];
      });
      aesMock.decrypt.mockImplementation(async (encryptedValue, key) => {
        if (encryptedValue === EncryptedBolt11 && key === Bolt11Hash) return DecryptedBolt11;
        if (encryptedValue === EncryptedDek && key === Bolt11Hash) return Dek;
        if (encryptedValue === EncryptedMetadata && key === Dek) return Metadata;
        throw new Error(`unexpected: decrypt(${encryptedValue}, ${key})`);
      });

      const { payments } = expectMatch(await service.verify(Bolt11Invoice));

      expect(payments[0]!.metadata).toBe(Metadata);
      expect(payments[0]!.isMetadataDecrypted).toBe(true);
    });

    test('verify_wrongKey_encryptedDekDecryptFails_leavesMetadataEncrypted', async () => {
      const payment: Payment = {
        destinations: [{ value: EncryptedBitcoinAddress, type: DestinationType.BitcoinAddress, encryptedDek: EncryptedDek }],
        metadata: EncryptedMetadata,
      };

      clientMock.getPayments.mockResolvedValue([payment]);
      aesMock.decrypt.mockImplementation(async (encryptedValue, key) => {
        if (encryptedValue === EncryptedBitcoinAddress && key === Secret) return BitcoinAddress;
        throw new Error('Decryption failed: auth tag mismatch');
      });

      const { payments } = expectMatch(await service.verify(brantaBitcoinLookup()));

      expect(payments[0]!.metadata).toBe(EncryptedMetadata);
      expect(payments[0]!.isMetadataDecrypted).toBeFalsy();
    });

    test('verify_twoEncryptedDestinationsWithEncryptedDek_decryptsMetadataOnce', async () => {
      const EncryptedBitcoinAddress2 = 'encrypted-bitcoin-address-2';
      const payment: Payment = {
        destinations: [
          { value: EncryptedBitcoinAddress, type: DestinationType.BitcoinAddress, encryptedDek: EncryptedDek },
          { value: EncryptedBitcoinAddress2, type: DestinationType.BitcoinAddress, encryptedDek: EncryptedDek },
        ],
        metadata: EncryptedMetadata,
      };

      clientMock.getPayments.mockResolvedValue([payment]);
      let metadataDecryptCount = 0;
      aesMock.decrypt.mockImplementation(async (encryptedValue, key) => {
        if ((encryptedValue === EncryptedBitcoinAddress || encryptedValue === EncryptedBitcoinAddress2) && key === Secret) return BitcoinAddress;
        if (encryptedValue === EncryptedDek && key === Secret) return Dek;
        if (encryptedValue === EncryptedMetadata && key === Dek) { metadataDecryptCount++; return Metadata; }
        throw new Error(`unexpected: decrypt(${encryptedValue}, ${key})`);
      });

      const { payments } = expectMatch(await service.verify(brantaBitcoinLookup()));

      expect(payments[0]!.metadata).toBe(Metadata);
      expect(metadataDecryptCount).toBe(1);
    });

    test('verify_noEncryptedDek_doesNotAttemptMetadataDecrypt', async () => {
      const payment: Payment = {
        destinations: [{ value: EncryptedBitcoinAddress, type: DestinationType.BitcoinAddress }],
        metadata: EncryptedMetadata,
      };

      clientMock.getPayments.mockResolvedValue([payment]);
      aesMock.decrypt.mockImplementation(async (encryptedValue, key) => {
        if (encryptedValue === EncryptedBitcoinAddress && key === Secret) return BitcoinAddress;
        throw new Error(`unexpected: decrypt(${encryptedValue}, ${key})`);
      });

      const { payments } = expectMatch(await service.verify(brantaBitcoinLookup()));

      expect(payments[0]!.metadata).toBe(EncryptedMetadata);
    });

    test('verify_noMetadata_doesNotAttemptDekDecrypt', async () => {
      const payment: Payment = {
        destinations: [{ value: EncryptedBitcoinAddress, type: DestinationType.BitcoinAddress, encryptedDek: EncryptedDek }],
      };

      clientMock.getPayments.mockResolvedValue([payment]);
      aesMock.decrypt.mockImplementation(async (encryptedValue, key) => {
        if (encryptedValue === EncryptedBitcoinAddress && key === Secret) return BitcoinAddress;
        throw new Error(`unexpected: decrypt(${encryptedValue}, ${key})`);
      });

      const { payments } = expectMatch(await service.verify(brantaBitcoinLookup()));

      expect(payments[0]!.metadata).toBeUndefined();
    });
  });

});
