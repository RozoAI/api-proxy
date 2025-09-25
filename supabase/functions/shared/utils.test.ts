// Tests for utility functions
import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { filterSensitiveMetadata, safeMetadataSpread } from './utils.ts';

Deno.test('filterSensitiveMetadata removes merchantToken', () => {
  const metadata = {
    orderId: 'order_123',
    customerId: 'customer_456',
    merchantToken: 'secret-token-xyz',
    otherData: 'should-remain',
  };

  const filtered = filterSensitiveMetadata(metadata);

  assertEquals(filtered.orderId, 'order_123');
  assertEquals(filtered.customerId, 'customer_456');
  assertEquals(filtered.otherData, 'should-remain');
  assertEquals(filtered.merchantToken, undefined);
});

Deno.test('filterSensitiveMetadata handles undefined metadata', () => {
  const filtered = filterSensitiveMetadata(undefined);
  assertEquals(filtered, {});
});

Deno.test('filterSensitiveMetadata handles null metadata', () => {
  const filtered = filterSensitiveMetadata(null);
  assertEquals(filtered, {});
});

Deno.test('filterSensitiveMetadata handles empty metadata', () => {
  const filtered = filterSensitiveMetadata({});
  assertEquals(filtered, {});
});

Deno.test('safeMetadataSpread works the same as filterSensitiveMetadata', () => {
  const metadata = {
    orderId: 'order_123',
    merchantToken: 'secret-token-xyz',
  };

  const filtered = safeMetadataSpread(metadata);

  assertEquals(filtered.orderId, 'order_123');
  assertEquals(filtered.merchantToken, undefined);
});