import { beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { BrantaClientOptions } from '../../../src/classes/brantaClientOptions.js';
import { BrantaServerBaseUrl } from '../../../src/enums/brantaServerBaseUrl.js';
import { DestinationType } from '../../../src/enums/destinationType.js';
import { PrivacyMode } from '../../../src/enums/privacyMode.js';
import { BrantaPaymentException } from '../../../src/exceptions/brantaPaymentException.js';
import { toNormalizedHash } from '../../../src/extensions/brantaExtensions.js';
import { PaymentBuilder } from '../../../src/v2/classes/paymentBuilder.js';
import { IAesEncryption } from '../../../src/v2/interfaces/iAesEncryption.js';
import { IBrantaClient } from '../../../src/v2/interfaces/iBrantaClient.js';
import { ISecretGenerator } from '../../../src/v2/interfaces/iSecretGenerator.js';
import { Payment } from '../../../src/v2/models/payment.js';
import { BrantaService } from '../../../src/v2/services/brantaService.js';

const BitcoinAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const EncryptedBitcoinAddress = 'encrypted-bitcoin-address';
const Secret = 'test-secret';

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

const plainBitcoinPayment = (): Payment =>
  new PaymentBuilder().addDestination(BitcoinAddress, DestinationType.BitcoinAddress).build();

const zkBitcoinPayment = (): Payment =>
  new PaymentBuilder().addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress).setZk().build();

const zkBolt11Payment = (): Payment =>
  new PaymentBuilder().addDestination(EncryptedBolt11, DestinationType.Bolt11).setZk().build();

const plainBolt11Payment = (): Payment =>
  new PaymentBuilder().addDestination(Bolt11Invoice, DestinationType.Bolt11).build();

const zkArkPayment = (): Payment =>
  new PaymentBuilder().addDestination(EncryptedArkAddress, DestinationType.ArkAddress).setZk().build();

describe('BrantaService', () => {
  let clientMock: ClientMock;
  let aesMock: AesMock;
  let secretMock: SecretMock;
  let defaultOptions: BrantaClientOptions;
  let service: BrantaService;
  let strictService: BrantaService;
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
      privacy: PrivacyMode.Loose,
    };
    service = new BrantaService(defaultOptions, {
      client: clientMock,
      aesEncryption: aesMock,
      secretGenerator: secretMock,
    });

    const strictOptions: BrantaClientOptions = {
      baseUrl: BrantaServerBaseUrl.Localhost,
      defaultApiKey: 'test-api-key',
      privacy: PrivacyMode.Strict,
    };
    strictService = new BrantaService(strictOptions, {
      client: clientMock,
      aesEncryption: aesMock,
      secretGenerator: secretMock,
    });
  });

  // ===== getPaymentsByQrCode =====

  describe('getPaymentsByQrCode', () => {
    test('getPaymentsByQrCode_zkBitcoinUri_usesZkParams', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [zkBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      const { payments } = await service.getPaymentsByQrCode(qrText);

      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBitcoinAddress, undefined, undefined);
      expect(payments[0]!.destinations[0]!.value).toBe(BitcoinAddress);
    });

    test('getPaymentsByQrCode_plainBitcoinUri_usesAddress', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === BitcoinAddress) return [plainBitcoinPayment()];
        return [];
      });

      const { payments } = await service.getPaymentsByQrCode(`bitcoin:${BitcoinAddress}`);

      expect(clientMock.getPayments).toHaveBeenCalledWith(BitcoinAddress, undefined, undefined);
      expect(payments).toHaveLength(1);
    });

    test('getPaymentsByQrCode_lightningBolt11Uri_usesEncryptedInvoiceLookup', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [plainBolt11Payment()];
        return [];
      });

      await service.getPaymentsByQrCode(`lightning:${Bolt11Invoice}`);

      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
    });

    test('getPaymentsByQrCode_uppercaseLightningBolt11Uri_usesEncryptedInvoiceLookup', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [plainBolt11Payment()];
        return [];
      });

      await service.getPaymentsByQrCode(`lightning:${Bolt11Invoice.toUpperCase()}`);

      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
    });

    test('getPaymentsByQrCode_lightningBolt11Uri_leavesUnrelatedZkBitcoinDestinationEncrypted', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .setZk()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .setZk()
        .build();

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [payment];
        return [];
      });

      const { payments } = await service.getPaymentsByQrCode(`lightning:${Bolt11Invoice}`);

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(DecryptedBolt11);
      expect(payments[0]!.destinations[0]!.isEncrypted).toBe(false);
      expect(payments[0]!.destinations[1]!.value).toBe(EncryptedBitcoinAddress);
      expect(payments[0]!.destinations[1]!.isEncrypted).toBe(true);
    });

    test('getPaymentsByQrCode_combinedZkQr_decryptsBothAddressAndInvoice', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .setZk()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .setZk()
        .addDestination(EncryptedArkAddress, DestinationType.ArkAddress)
        .setZk()
        .build();

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [payment];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}&lightning=${Bolt11Invoice}&ark=${ArkAddress}`;
      const { payments, verifyUrl } = await service.getPaymentsByQrCode(qrText);

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

  // ===== getPayments =====

  describe('getPayments', () => {
    test('getPayments_shouldReturnPayments_whenClientSucceeds', async () => {
      clientMock.getPayments.mockResolvedValue([plainBitcoinPayment()]);

      const { payments } = await service.getPayments(BitcoinAddress);

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(BitcoinAddress);
    });

    test('getPayments_shouldReturnEmptyList_whenClientReturnsEmpty', async () => {
      clientMock.getPayments.mockResolvedValue([]);

      const { payments, verifyUrl } = await service.getPayments(BitcoinAddress);

      expect(payments).toHaveLength(0);
      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${BitcoinAddress}`);
    });

    test('getPayments_shouldForwardOptions_toClient', async () => {
      clientMock.getPayments.mockResolvedValue([plainBitcoinPayment()]);

      await service.getPayments(BitcoinAddress, undefined, defaultOptions);

      expect(clientMock.getPayments).toHaveBeenCalledWith(expect.any(String), defaultOptions, undefined);
    });

    test('getPayments_shouldForwardAbortSignal_toClient', async () => {
      const controller = new AbortController();
      clientMock.getPayments.mockResolvedValue([]);

      await service.getPayments(BitcoinAddress, undefined, undefined, controller.signal);

      expect(clientMock.getPayments).toHaveBeenCalledWith(expect.any(String), undefined, controller.signal);
    });

    test('getPayments_zkBitcoinAddress_decryptsDestinationValue', async () => {
      clientMock.getPayments.mockResolvedValue([zkBitcoinPayment()]);

      const { payments } = await service.getPayments(EncryptedBitcoinAddress, Secret);

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(BitcoinAddress);
      expect(aesMock.decrypt).toHaveBeenCalledWith(EncryptedBitcoinAddress, Secret);
    });

    test('getPayments_zkBitcoinAddress_noKey_leavesEncrypted', async () => {
      clientMock.getPayments.mockResolvedValue([zkBitcoinPayment()]);

      const { payments } = await service.getPayments(EncryptedBitcoinAddress, undefined);

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(EncryptedBitcoinAddress);
      expect(payments[0]!.destinations[0]!.isEncrypted).toBe(true);
      expect(aesMock.decrypt).not.toHaveBeenCalled();
    });

    test('getPayments_zkBitcoinAddress_wrongKey_leavesEncrypted', async () => {
      clientMock.getPayments.mockResolvedValue([zkBitcoinPayment()]);
      aesMock.decrypt.mockImplementationOnce(async () => {
        throw new Error('Decryption failed: auth tag mismatch');
      });

      const { payments } = await service.getPayments(EncryptedBitcoinAddress, 'wrong-key');

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(EncryptedBitcoinAddress);
      expect(payments[0]!.destinations[0]!.isEncrypted).toBe(true);
    });

    test('getPayments_nonZkDestination_doesNotDecrypt', async () => {
      clientMock.getPayments.mockResolvedValue([plainBitcoinPayment()]);

      const { payments } = await service.getPayments(BitcoinAddress, Secret);

      expect(payments[0]!.destinations[0]!.value).toBe(BitcoinAddress);
      expect(aesMock.decrypt).not.toHaveBeenCalled();
    });

    test('getPayments_zkBolt11_withBolt11DestinationValue_decryptsUsingHash', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [zkBolt11Payment()];
        return [];
      });

      const { payments } = await service.getPayments(Bolt11Invoice);

      expect(payments).toHaveLength(1);
      expect(payments[0]!.destinations[0]!.value).toBe(DecryptedBolt11);
      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
      expect(aesMock.decrypt).toHaveBeenCalledWith(EncryptedBolt11, Bolt11Hash);
    });

    test('getPayments_zkBolt11_withNonBolt11DestinationValue_doesNotDecrypt', async () => {
      const nonBolt11 = 'not-a-bolt11-value';
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === nonBolt11) return [zkBolt11Payment()];
        return [];
      });

      const { payments } = await service.getPayments(nonBolt11);

      expect(payments[0]!.destinations[0]!.value).toBe(EncryptedBolt11);
      expect(clientMock.getPayments).toHaveBeenCalledWith(nonBolt11, undefined, undefined);
      expect(aesMock.decrypt).not.toHaveBeenCalled();
    });

    test('getPayments_nonZkBolt11_doesNotDecrypt', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [plainBolt11Payment()];
        return [];
      });

      const { payments } = await service.getPayments(Bolt11Invoice);

      expect(payments[0]!.destinations[0]!.value).toBe(Bolt11Invoice);
      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
      expect(aesMock.decrypt).not.toHaveBeenCalled();
    });

    test('getPayments_plainBitcoinAddress_setsVerifyUrl', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === BitcoinAddress) return [plainBitcoinPayment()];
        return [];
      });

      const { verifyUrl } = await service.getPayments(BitcoinAddress);

      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${BitcoinAddress}`);
    });

    test('getPayments_plainBolt11_setsVerifyUrl', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [];
        if (lookup === Bolt11Invoice) return [plainBolt11Payment()];
        return [];
      });

      const { verifyUrl } = await service.getPayments(Bolt11Invoice);

      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${Bolt11Invoice}`);
    });

    test('getPayments_zkBitcoinAddress_setsVerifyUrlWithKeyFragment', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .setZk()
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [payment];
        return [];
      });

      const { verifyUrl } = await service.getPayments(EncryptedBitcoinAddress, Secret);

      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBitcoinAddress}#k-${zkId}=${Secret}`);
    });

    test('getPayments_zkBolt11_setsVerifyUrlWithKeyFragment', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .setZk()
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [payment];
        return [];
      });

      const { verifyUrl } = await service.getPayments(Bolt11Invoice);

      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBolt11}#k-${zkId}=${Bolt11Hash}`);
    });

    test('getPayments_zkBitcoinAndBolt11_setsVerifyUrlWithBothKeyFragments', async () => {
      const payment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .setZk()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .setZk()
        .build();

      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [payment];
        if (lookup === EncryptedBitcoinAddress) return [payment];
        return [];
      });

      let result = await service.getPayments(Bolt11Invoice, Secret);

      const zkIdBitcoin = payment.destinations[0]!.zkId!;
      const zkIdBolt11 = payment.destinations[1]!.zkId!;
      expect(result.verifyUrl).toBe(
        `http://localhost:3000/v2/verify/${EncryptedBolt11}#k-${zkIdBitcoin}=${Secret}&k-${zkIdBolt11}=${Bolt11Hash}`,
      );

      result = await service.getPayments(EncryptedBitcoinAddress, Secret);

      expect(result.verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBitcoinAddress}#k-${zkIdBitcoin}=${Secret}`);
    });

    test('getPayments_looseMode_bolt11NotFound_verifyUrlUsesPlainValue', async () => {
      clientMock.getPayments.mockResolvedValue([]);

      const { payments, verifyUrl } = await service.getPayments(Bolt11Invoice);

      expect(payments).toHaveLength(0);
      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${Bolt11Invoice}`);
      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
      expect(clientMock.getPayments).toHaveBeenCalledWith(Bolt11Invoice, undefined, undefined);
    });
  });

  // ===== addPayment =====

  describe('addPayment', () => {
    test('addPayment_plainDestination_doesNotEncrypt', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .build();

      clientMock.postPayment.mockResolvedValue(plainBitcoinPayment());

      await service.addPayment(payment);

      expect(aesMock.encrypt).not.toHaveBeenCalled();
    });

    test('addPayment_zkBitcoinAddress_encryptsWithSecret', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .setZk()
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.isZk = true;
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
        .setZk()
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBolt11, DestinationType.Bolt11)
        .build();
      responsePayment.destinations[0]!.isZk = true;
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      await service.addPayment(payment);

      expect(aesMock.encrypt).toHaveBeenCalledWith(Bolt11Invoice, Bolt11Hash, true);
      expect(payment.destinations[0]!.value).toBe(EncryptedBolt11);
    });

    test('addPayment_zkArkAddress_encryptsWithHash', async () => {
      const payment = new PaymentBuilder()
        .addDestination(ArkAddress, DestinationType.ArkAddress)
        .setZk()
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedArkAddress, DestinationType.ArkAddress)
        .build();
      responsePayment.destinations[0]!.isZk = true;
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      await service.addPayment(payment);

      expect(aesMock.encrypt).toHaveBeenCalledWith(ArkAddress, ArkHash, true);
      expect(payment.destinations[0]!.value).toBe(EncryptedArkAddress);
    });

    test('addPayment_zkBitcoinAddress_setsVerifyUrlWithKeyFragment', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .setZk()
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.isZk = true;
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      const { verifyUrl } = await service.addPayment(payment);

      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBitcoinAddress}#k-${zkId}=${Secret}`);
    });

    test('addPayment_returnsGeneratedSecret', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .setZk()
        .build();

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.isZk = true;
      responsePayment.destinations[0]!.zkId = payment.destinations[0]!.zkId!;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      const { secret } = await service.addPayment(payment);

      expect(secret).toBe(Secret);
    });

    test('addPayment_unsupportedZkType_throws', async () => {
      const payment = new PaymentBuilder()
        .addDestination('0xdeadbeef', DestinationType.TetherAddress)
        .setZk()
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

  // ===== StrictMode =====

  describe('StrictMode', () => {
    test('getPayments_strictMode_bitcoinAddress_throws', async () => {
      await expect(strictService.getPayments(BitcoinAddress)).rejects.toThrow(BrantaPaymentException);
      expect(clientMock.getPayments).not.toHaveBeenCalled();
    });

    test('getPayments_strictMode_bolt11Invoice_doesNotThrow_usesEncryptedLookup', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [zkBolt11Payment()];
        return [];
      });

      await strictService.getPayments(Bolt11Invoice);

      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
    });

    test('getPayments_strictMode_arkAddress_doesNotThrow_usesEncryptedLookup', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedArkAddress) return [zkArkPayment()];
        return [];
      });

      await strictService.getPayments(ArkAddress);

      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedArkAddress, undefined, undefined);
    });

    test('getPayments_strictMode_bolt11_noFallbackToPlainText', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [];
        if (lookup === Bolt11Invoice) return [plainBolt11Payment()];
        return [];
      });

      const { payments, verifyUrl } = await strictService.getPayments(Bolt11Invoice);

      expect(payments).toHaveLength(0);
      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${EncryptedBolt11}`);
      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
      expect(clientMock.getPayments).not.toHaveBeenCalledWith(Bolt11Invoice, undefined, undefined);
    });

    test('getPaymentsByQrCode_strictMode_plainBitcoinUri_returnsEmptyList', async () => {
      const { payments, verifyUrl } = await strictService.getPaymentsByQrCode(`bitcoin:${BitcoinAddress}`);

      expect(payments).toHaveLength(0);
      expect(verifyUrl).toBe(`http://localhost:3000/v2/verify/${BitcoinAddress}`);
      expect(clientMock.getPayments).not.toHaveBeenCalled();
    });

    test('getPaymentsByQrCode_strictMode_zkBitcoinUri_succeeds', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBitcoinAddress) return [zkBitcoinPayment()];
        return [];
      });

      const qrText = `bitcoin:${BitcoinAddress}?branta_id=${EncryptedBitcoinAddress}&branta_secret=${Secret}`;
      const { payments } = await strictService.getPaymentsByQrCode(qrText);

      expect(payments).toHaveLength(1);
      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBitcoinAddress, undefined, undefined);
    });

    test('getPaymentsByQrCode_strictMode_lightningBolt11Uri_succeeds', async () => {
      clientMock.getPayments.mockImplementation(async (lookup: string) => {
        if (lookup === EncryptedBolt11) return [plainBolt11Payment()];
        return [];
      });

      await strictService.getPaymentsByQrCode(`lightning:${Bolt11Invoice}`);

      expect(clientMock.getPayments).toHaveBeenCalledWith(EncryptedBolt11, undefined, undefined);
    });

    test('addPayment_strictMode_plainDestination_throws', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .build();

      await expect(strictService.addPayment(payment)).rejects.toThrow(BrantaPaymentException);
      expect(clientMock.postPayment).not.toHaveBeenCalled();
    });

    test('addPayment_strictMode_allZkDestinations_succeeds', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .setZk()
        .build();
      const zkId = payment.destinations[0]!.zkId!;

      const responsePayment = new PaymentBuilder()
        .addDestination(EncryptedBitcoinAddress, DestinationType.BitcoinAddress)
        .build();
      responsePayment.destinations[0]!.isZk = true;
      responsePayment.destinations[0]!.zkId = zkId;

      clientMock.postPayment.mockResolvedValue(responsePayment);

      await strictService.addPayment(payment);

      expect(clientMock.postPayment).toHaveBeenCalledTimes(1);
    });

    test('addPayment_strictMode_mixedDestinations_throws', async () => {
      const payment = new PaymentBuilder()
        .addDestination(BitcoinAddress, DestinationType.BitcoinAddress)
        .setZk()
        .addDestination(Bolt11Invoice, DestinationType.Bolt11)
        .build();

      await expect(strictService.addPayment(payment)).rejects.toThrow(BrantaPaymentException);
      expect(clientMock.postPayment).not.toHaveBeenCalled();
    });
  });
});
