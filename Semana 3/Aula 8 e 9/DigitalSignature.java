import java.security.*;

public class DigitalSignature {
    public static void main(String[] args) throws NoSuchAlgorithmException, InvalidKeyException, SignatureException {
        byte[] plaintext = "The quick brown fox jumps over the lazy dog".getBytes();

        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        KeyPair pair = generator.generateKeyPair();

        PublicKey publicKey = pair.getPublic();
        PrivateKey privateKey = pair.getPrivate();

        System.out.println(publicKey);
        System.out.println(privateKey);

        // Sign
        Signature digitalSignature = Signature.getInstance("SHA1withRSA");
        digitalSignature.initSign(privateKey);
        digitalSignature.update(plaintext);
        byte[] signature = digitalSignature.sign();

        // change message
         plaintext[4] = 'Q';

        // Verify signature
        digitalSignature.initVerify(publicKey);
        digitalSignature.update(plaintext);
        boolean result = digitalSignature.verify(signature);
        System.out.println("Signature valid? " + result);
    }
}
