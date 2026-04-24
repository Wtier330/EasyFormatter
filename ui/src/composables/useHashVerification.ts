import { ref, computed } from 'vue';

export type VerificationStatus = 'none' | 'pending' | 'ok' | 'fail';

export function useHashVerification() {
  const calculatedHash = ref('');
  const isVerifying = ref(false);

  async function sha256Hex(text: string): Promise<string | null> {
    const cryptoAny = globalThis.crypto as Crypto | undefined;
    if (!cryptoAny?.subtle) return null;

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await cryptoAny.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function buildHashBasisText(text: string): string {
    try {
      const val = JSON.parse(text);
      return JSON.stringify(val);
    } catch {
      return text;
    }
  }

  function getVerificationStatus(externalHash: string | undefined): VerificationStatus {
    if (!externalHash) return 'none';
    if (isVerifying.value) return 'pending';
    if (!calculatedHash.value) return 'pending';
    return calculatedHash.value === externalHash ? 'ok' : 'fail';
  }

  const verificationStatus = computed(() => 'none');
  const verificationStatusLabel = computed(() => null);
  const verificationStatusTagType = computed(() => 'default');

  async function verifyHash(
    content: string,
    externalHash: string | undefined,
    onUpdate: (hash: string) => void
  ) {
    if (!externalHash) {
      calculatedHash.value = '';
      isVerifying.value = false;
      return;
    }

    isVerifying.value = true;
    try {
      const basis = buildHashBasisText(content);
      const hex = await sha256Hex(basis);
      calculatedHash.value = hex ?? '';
      onUpdate(calculatedHash.value);
    } finally {
      isVerifying.value = false;
    }
  }

  return {
    calculatedHash,
    isVerifying,
    sha256Hex,
    buildHashBasisText,
    getVerificationStatus,
    verificationStatus,
    verificationStatusLabel,
    verificationStatusTagType,
    verifyHash
  };
}
