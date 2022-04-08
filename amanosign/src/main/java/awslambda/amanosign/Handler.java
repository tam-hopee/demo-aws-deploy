package awslambda.amanosign;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.*;

import java.security.MessageDigest;
import java.util.Map;
import java.math.BigInteger;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.GetObjectRequest;
import com.amazonaws.services.s3.model.PutObjectRequest;
import com.amazonaws.services.s3.model.S3Object;
import com.amazonaws.services.lambda.runtime.*;
import com.amazonaws.regions.Regions;
import jp.co.amano.etiming.apl3161.*;
import jp.co.amano.etiming.atss3161.*;

public class Handler implements RequestHandler<Map<String, String>, Response> {

	@Override
	public Response handleRequest(Map<String, String> input, Context context) {
		LambdaLogger logger = context.getLogger();
		logger.log("Received event: " + input);
		logger.log("Start amano sign");
		try {
			AmazonS3 s3 = AmazonS3ClientBuilder
				.standard()
				.withRegion(Regions.AP_NORTHEAST_1)
				.build();

			String timeStampServerEndpoint = System.getenv("TIMESTAMP_SERVER_ENDPOINT");
			String atlFilePath = System.getenv("ATL_FILEPATH");
			String passwordStr = System.getenv("TIMESTAMP_SERVER_PASSWORD");

			String bucketName = "ccamano";
			S3Object atlObject = s3.getObject(new GetObjectRequest(bucketName, atlFilePath));
			char[] password = passwordStr.toCharArray();

			// Generate protocol
			AmanoTimeStampProtocol protocol = new AmanoTimeStampProtocol(timeStampServerEndpoint, readFile(atlObject), password);

			// Create timestamp generate object
			PDFTimeStampGenerator generator = new PDFTimeStampGenerator(protocol);
			generator.setTimeZone(DefinedTimeZone.JST);

			NoTSACertValidationTSTValidator validator = new NoTSACertValidationTSTValidator();
			generator.setTSTValidator(validator);

			generator.setImprintPasting(null);

			// Parse parameter from event
			String path = input.get("bucket");
			String documentFileName = input.get("fileName");

			int index = path.indexOf("/");
			String documentBucketName = path.substring(0, index);
			String documentKey = path.substring(index+1) + "/" + documentFileName;

			S3Object object3 = s3.getObject(new GetObjectRequest(documentBucketName, documentKey));
			byte[] pdfDocument = readFile(object3);

			// Generate pdf timestamp
			InputStream stamped = null;
			stamped = generator.generate(pdfDocument);

			// Save pdf file to temporary directory
			String tmpPdfFileName = createMd5(documentKey);
			writeFile(stamped, "/tmp/" + tmpPdfFileName);
			stamped.close();

			// Put pdf to s3
			File file = new File("/tmp/" + tmpPdfFileName + ".new.pdf");
			PutObjectRequest request = new PutObjectRequest(
					documentBucketName,
					documentKey,
					file
			);
			s3.putObject(request);

			// clean up
			cleanUp(file);

			logger.log("Finish amano sign");
		} catch (AmanoTransportException ex) {
			logger.log("Error code is :" + ex.getDetailCode());
		} catch (Exception e) {
			logger.log(e.getMessage());
		} finally {
			return Response.builder()
					.setStatusCode(200)
					.setObjectBody("")
					.build();
		}
	}

	static byte[] readFile(S3Object object) throws Exception {
		BufferedInputStream in = new BufferedInputStream(object.getObjectContent());
		try {
			ByteArrayOutputStream out = new ByteArrayOutputStream();
			byte[] buf = new byte[4096];
			while (true) {
				int i = in.read(buf);
				if (i <= 0) {
					break;
				}
				out.write(buf, 0, i);
			}
			return out.toByteArray();
		} finally {
			in.close();
		}
	}
	static void writeFile(InputStream in, String filePath) throws Exception {
		FileOutputStream out = new FileOutputStream(filePath + ".new.pdf");
		try {
			byte[] buf = new byte[4096];
			while (true) {
				int i = in.read(buf);
				if (i <= 0) {
					break;
				}
				out.write(buf, 0, i);
			}
		} finally {
			out.close();
		}
	}

	static String createMd5(String key) throws Exception {
		MessageDigest md5 = MessageDigest.getInstance("MD5");
		byte[] md5_result = md5.digest(key.getBytes());
		System.out.println("MD5：" + String.format("%020x", new BigInteger(1, md5_result)));
		return String.format("%020x", new BigInteger(1, md5_result));
	}

	static void cleanUp(File file) {
		if (file.exists()) {
			file.delete();
		}
	}
}
