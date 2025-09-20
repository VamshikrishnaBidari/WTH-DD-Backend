import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface UploadResponse {
  public_id: string;
  url: string;
  [key: string]: any;
}

const uploadOnCloudinary = async (
  localFilePath: string,
): Promise<UploadResponse | null> => {
  try {
    if (!localFilePath) return null;
    const response: UploadResponse = await cloudinary.uploader.upload(
      localFilePath,
      {
        resource_type: "auto",
      },
    );
    console.log("File uploaded successfully", response);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error("Error uploading file to cloudinary", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
