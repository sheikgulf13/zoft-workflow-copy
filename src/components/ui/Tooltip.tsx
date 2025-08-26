import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
             {isVisible && (
         <div className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded-md shadow-lg w-[320px] -top-8 left-1/2 transform -translate-x-1/2">
           <div className="break-words">
             {content}
           </div>
           <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
         </div>
       )}
    </div>
  );
};
