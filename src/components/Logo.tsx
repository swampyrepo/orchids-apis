import React from "react";

export const Logo = ({ 
  width = 105, 
  height, 
    src = "https://visora-dev-assets-id.assetsvsiddev.workers.dev/index/base-logo.png" 

}: { 
  width?: number; 
  height?: number;
  src?: string;
}) => {
  return (
    <img 
      src={src} 
      width={width} 
      height={height} 
        alt="Vallzx APIs Logo" 
        style={{ 
          maxWidth: '100%', 
          height: height ? height : 'auto',
          objectFit: 'contain'
        }} 
      />
  );
};
