import { useState } from "react";
import { X, FileText, FileUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

type CreateFlowModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type CreateOption = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
};

export default function CreateFlowModal({ isOpen, onClose }: CreateFlowModalProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleFromScratch = () => {
    setIsLoading("scratch");
    // Navigate to flow editor
    navigate("/flows/create");
    onClose();
  };

  const handleUseTemplate = () => {
    setIsLoading("template");
    // TODO: Implement template selection
    console.log("Use template clicked");
    setTimeout(() => setIsLoading(null), 1000);
  };

  const handleFromFile = () => {
    setIsLoading("file");
    // TODO: Implement file upload
    console.log("From file clicked");
    setTimeout(() => setIsLoading(null), 1000);
  };

  const createOptions: CreateOption[] = [
    {
      id: "scratch",
      title: "From scratch",
      description: "Start with a blank canvas and build your flow step by step",
      icon: <Sparkles size={24} className="text-[#b3a1ff]" />,
      action: handleFromScratch,
    },
    {
      id: "template",
      title: "Use a template",
      description: "Choose from pre-built templates to get started quickly",
      icon: <FileText size={24} className="text-[#a4f5a6]" />,
      action: handleUseTemplate,
    },
    {
      id: "file",
      title: "From a local file",
      description: "Import an existing flow from a JSON or YAML file",
      icon: <FileUp size={24} className="text-[#8dff8d]" />,
      action: handleFromFile,
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-theme-form backdrop-blur-md border border-white/20 dark:border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/20 dark:border-white/10 p-6">
          <div>
            <h2 className="text-lg font-semibold text-theme-primary">Create Flow</h2>
            <p className="text-sm text-theme-secondary">Choose how you want to create your flow</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-theme-tertiary transition-all duration-200 hover:bg-theme-input hover:text-theme-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-theme-primary/20"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {createOptions.map((option) => (
            <button
              key={option.id}
              onClick={option.action}
              disabled={isLoading !== null}
              className="w-full flex items-start gap-4 p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-theme-input text-left transition-all duration-200 hover:bg-theme-input-focus hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-theme-primary/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none"
            >
              <div className="flex-shrink-0 mt-1">
                {option.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-theme-primary mb-1">
                  {option.title}
                </h3>
                <p className="text-xs text-theme-secondary leading-relaxed">
                  {option.description}
                </p>
              </div>
              {isLoading === option.id && (
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#b3a1ff] border-t-transparent"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


