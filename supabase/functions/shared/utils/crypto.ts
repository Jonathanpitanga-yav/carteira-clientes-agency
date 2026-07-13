// Utilitário de criptografia utilizando a API nativa Web Crypto do Deno (AES-GCM)

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  // Gera um hash SHA-256 para garantir que a chave tenha sempre 256 bits (32 bytes)
  const hash = await crypto.subtle.digest("SHA-256", keyData);
  return await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Criptografa uma string usando AES-GCM.
 * Retorna uma string em formato Base64 contendo o IV e o texto cifrado.
 */
export async function encrypt(text: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // IV recomendado de 12 bytes para AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );

  // Combinar IV + Ciphertext em um único buffer
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Converter para string binária e depois para Base64
  let binary = "";
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decriptografa uma string em Base64 usando AES-GCM.
 */
export async function decrypt(encryptedBase64: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  
  // Converter Base64 de volta para Uint8Array
  const binaryString = atob(encryptedBase64);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}
