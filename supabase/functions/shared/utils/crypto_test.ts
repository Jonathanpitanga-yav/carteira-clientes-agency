import { encrypt, decrypt } from "./crypto.ts";

const secret = "minha-chave-secreta-super-segura-123";
const originalText = "token-secreto-do-bling-ou-tiny-123456";

try {
  console.log("Original:", originalText);
  const encrypted = await encrypt(originalText, secret);
  console.log("Encrypted (Base64):", encrypted);
  const decrypted = await decrypt(encrypted, secret);
  console.log("Decrypted:", decrypted);
  
  if (originalText === decrypted) {
    console.log("✅ Teste de criptografia passou com sucesso!");
  } else {
    console.error("❌ Teste falhou: o texto decriptografado é diferente do original.");
  }
} catch (error) {
  console.error("❌ Ocorreu um erro durante o teste:", error);
}
