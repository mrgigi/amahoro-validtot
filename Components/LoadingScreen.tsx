import React from "react";
import { Loader } from "lucide-react";

type LoadingScreenProps = {
  mainText: string;
  secondaryText?: string;
};

export default function LoadingScreen({
  mainText,
  secondaryText,
}: LoadingScreenProps) {
  const subtitle =
    secondaryText === undefined
      ? "If this takes long, check your internet connection and refresh."
      : secondaryText;

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F5] p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <img
            src="https://zfneybzvjppfyvcxggjf.supabase.co/storage/v1/object/sign/website/_Transparent%20logo%20(6).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZmE3ZmRlMC1jNGQyLTQ4YzAtYjZmZC1kYTRkZDJhN2RiN2YiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ3ZWJzaXRlL19UcmFuc3BhcmVudCBsb2dvICg2KS5wbmciLCJpYXQiOjE3NjM0OTI3MDMsImV4cCI6MTc5NTAyODcwM30.B2tlRx8zpNVWvX__Otu5B8qynfzFUG-W5_eP6mbeY4I"
            alt="ValidToT"
            className="w-64 max-w-full"
          />
        </div>
        <div className="text-lg font-bold mb-6">{mainText}</div>
        <Loader className="w-12 h-12 animate-spin mx-auto mb-3" />
        {subtitle && (
          <div className="text-sm font-bold text-gray-500">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

