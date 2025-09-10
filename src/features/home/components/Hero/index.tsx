import { Send } from "lucide-react";
import { SmudgyBackground } from "../../../../components/ui";

export default function Hero() {
  return (
    <div className="h-[90vh] flex flex-col items-center justify-center relative overflow-hidden">
      <SmudgyBackground colorHex={"#b3a1ff"} baseOpacity={0.15} zIndex={0} />
      <div className="relative z-10 text-center mb-12">
        <h2 className="text-4xl font-bold text-theme-primary mb-4">
          How can I help you?
        </h2>
        <p className="text-lg text-theme-secondary max-w-2xl mx-auto leading-relaxed">
          Describe what you want to automate and I'll help you build it with our
          powerful workflow engine
        </p>
      </div>
      <div className="relative z-10 w-full max-w-4xl">
        <div className="relative">
          <textarea
            placeholder="e.g., I want to automatically save new Gmail emails to a Google Sheets spreadsheet..."
            className="w-full h-36 px-6 py-4 pr-16 bg-theme-background backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl resize-none focus:ring-2 focus:ring-theme-primary/20 focus:bg-theme-input-focus text-theme-primary placeholder:text-theme-inverse shadow-xl transition-all duration-300"
          />
          <button className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-theme-primary hover:bg-[#a08fff] text-theme-inverse rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-theme-primary/20">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
