import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import java.io.IOException;

public class SSLClientDemo {
  public static void main(String[] args) throws IOException {
    // fábrica de sockets com raizes de confiança da plataforma Java
    SSLSocketFactory factory = (SSLSocketFactory) SSLSocketFactory.getDefault();

    // socket SSL de cliente
    SSLSocket socket = (SSLSocket) factory.createSocket("www.isel.pt", 443);

    // Mostrar certificado do servidor
    System.out.println(socket.getSession().getPeerCertificates()[0]);

    // mostrar esquemas criptográficos acordados
    System.out.println(socket.getSession().getCipherSuite());
  }
}
