"use client";

import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";

export default function MultiImageUpload() {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: "pending", // pending, uploading, success, error
      s3Url: null,
      error: null,
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id);
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return updated;
    });
  };

  const uploadToS3 = async (image) => {
    const formData = new FormData();
    formData.append("file", image.file);

    try {
      // Replace with your actual API endpoint
      const response = await fetch(
        "https://vendorapi.awfis.com:7443/api/v1/addimage",
        {
          method: "POST",
          body: formData,
          // Add headers if needed (e.g., authorization)
          // headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
        }
      );

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      return data.data.filepath; // Adjust based on your API response
    } catch (error) {
      throw error;
    }
  };

  const downloadCSV = (urls) => {
    // Create CSV content
    const csvContent = [
      ["Filename", "S3 URL", "Upload Date"],
      ...urls.map((item, idx) => [
        item.filename,
        item.url,
        new Date().toISOString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `s3-urls-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUploadAll = async () => {
    setUploading(true);
    const pendingImages = images.filter((img) => img.status === "pending");

    for (const image of pendingImages) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, status: "uploading" } : img
        )
      );

      try {
        const s3Url = await uploadToS3(image);
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, status: "success", s3Url } : img
          )
        );
      } catch (error) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, status: "error", error: error.message }
              : img
          )
        );
      }
    }

    setUploading(false);

    // Automatically download CSV after all uploads complete
    const successfulUploads = images
      .filter((img) => img.status === "success" && img.s3Url)
      .map((img) => ({
        filename: img.file.name,
        url: img.s3Url,
      }));

    // if (successfulUploads.length > 0) {
    //   downloadCSV(successfulUploads);
    // }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const successCount = images.filter((img) => img.status === "success").length;
  const s3Urls = images
    .filter((img) => img.status === "success")
    .map((img) => img.s3Url);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Multiple Image Upload
        </h2>

        {/* Upload Area */}
        <div className="mb-6">
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 text-gray-400 mb-3" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag
                and drop
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group rounded-lg overflow-hidden border-2 border-gray-200"
                >
                  <img
                    src={image.preview}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                  />

                  {/* Status Overlay */}
                  <div
                    style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    {getStatusIcon(image.status)}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Error Message */}
                  {image.error && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 text-center">
                      {image.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {images.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {successCount > 0 && (
                <span className="text-green-600 font-medium">
                  {successCount} of {images.length} uploaded
                </span>
              )}
              {successCount === 0 && (
                <span>{images.length} image(s) selected</span>
              )}
            </div>
            <button
              onClick={handleUploadAll}
              disabled={
                uploading || images.every((img) => img.status !== "pending")
              }
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload All
                </>
              )}
            </button>
          </div>
        )}

        {/* S3 URLs Display with Manual Download */}
        {s3Urls.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-700">S3 URLs:</h3>
              <button
                onClick={() =>
                  downloadCSV(
                    images
                      .filter((img) => img.status === "success" && img.s3Url)
                      .map((img) => ({
                        filename: img.file.name,
                        url: img.s3Url,
                      }))
                  )
                }
                className="flex items-center gap-1 text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>
            <div className="space-y-1">
              {s3Urls.map((url, idx) => (
                <div key={idx} className="text-xs text-gray-600 break-all">
                  {url}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
