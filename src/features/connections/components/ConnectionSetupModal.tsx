import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toastError, toastSuccess } from "../../../components/ui/Toast";
import { useContextStore } from "../../../app/store/context";
import { http } from "../../../shared/api";
import type { Connection } from "../../../types/connection";
import type { ActivePiece } from "../types/connection.types";

type ConnectionSetupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  piece: ActivePiece;
  onConnectionCreated: (connection: Connection) => void;
  mode?: "create" | "edit";
  existingConnection?: Connection | null;
  onConnectionUpdated?: (connection: Connection) => void;
};

type ConnectionFormData = {
  displayName: string;
  [key: string]: string;
};

export default function ConnectionSetupModal({
  isOpen,
  onClose,
  piece,
  onConnectionCreated,
  mode = "create",
  existingConnection,
  onConnectionUpdated,
}: ConnectionSetupModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const currentProject = useContextStore((state) => state.currentProject);

  const form = useForm<ConnectionFormData>({
    defaultValues: { displayName: `${piece.displayName} Connection` },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && existingConnection) {
      form.reset({ displayName: existingConnection.displayName });
    } else {
      form.reset({ displayName: `${piece.displayName} Connection` });
    }
  }, [isOpen, mode, existingConnection, piece.displayName, form]);

  const handleSubmit = async (data: ConnectionFormData) => {
    if (!currentProject?.id) {
      toastError(
        "No project selected",
        "Please select a project to create a connection"
      );
      return;
    }

    if (mode === "edit" && existingConnection) {
      const displayName = data.displayName.trim();
      if (displayName.length === 0) {
        toastError("Invalid name", "Display name is required");
        return;
      }
      if (displayName === existingConnection.displayName) {
        toastError("No changes detected", "Update the name to save changes");
        return;
      }
      setIsUpdating(true);
      try {
        const baseUrl =
          import.meta.env.VITE_BACKEND_API_URL ||
          import.meta.env.BACKEND_API_URL ||
          "";
        const url = `${
          baseUrl ? baseUrl.replace(/\/$/, "") : ""
        }/api/projects/${currentProject.id}/app-connections/${
          existingConnection.id
        }`;
        const body = {
          displayName,
          metadata: existingConnection.metadata,
        } as const;
        await http.post(url, body);
        const updated: Connection = { ...existingConnection, displayName };
        if (onConnectionUpdated) {
          onConnectionUpdated(updated);
        }
        toastSuccess("Connection updated", `${displayName} has been updated`);
        onClose();
        form.reset();
      } catch (error: unknown) {
        let errorMessage = "Failed to update connection. Please try again.";
        if (error && typeof error === "object" && "response" in error) {
          const axiosError = error as {
            response?: { data?: { message?: string } };
          };
          errorMessage = axiosError.response?.data?.message || errorMessage;
        }
        toastError("Update failed", errorMessage);
      } finally {
        setIsUpdating(false);
      }
      return;
    }

    setIsCreating(true);
    try {
      const { displayName, ...authValues } = data;
      const pieceName = piece.name.startsWith("@activepieces/piece-")
        ? piece.name
        : `@activepieces/piece-${piece.name}`;
      const requestBody = {
        externalId: `conn_${Date.now()}`,
        displayName,
        pieceName,
        type: piece.auth?.type || "CUSTOM_AUTH",
        value: authValues,
        metadata: {
          pieceDisplayName: piece.displayName,
          pieceLogoUrl: piece.logoUrl,
          createdAt: new Date().toISOString(),
        },
      };
      const baseUrl =
        import.meta.env.VITE_BACKEND_API_URL ||
        import.meta.env.BACKEND_API_URL ||
        "";
      const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/projects/${
        currentProject.id
      }/app-connections`;
      const response = await http.post(url, requestBody);
      onConnectionCreated(response.data);
      toastSuccess(
        "Connection created",
        `${displayName} has been successfully created`
      );
      onClose();
      form.reset();
    } catch (error: unknown) {
      console.error("Failed to create connection:", error);
      let errorMessage = "Failed to create connection. Please try again.";
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        errorMessage = axiosError.response?.data?.message || errorMessage;
      }
      toastError("Connection failed", errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const getFormFields = () => {
    const commonFields = [
      {
        name: "displayName",
        label: "Connection Name",
        type: "text",
        required: true,
        placeholder: "Enter connection name",
      },
    ];
    if (piece.auth?.props) {
      const authFields = Object.entries(piece.auth.props).map(
        ([key, prop]) => ({
          name: key,
          label: prop.displayName,
          type: prop.type === "SHORT_TEXT" ? "text" : "password",
          required: prop.required,
          placeholder: `Enter ${prop.displayName.toLowerCase()}`,
        })
      );
      return [...commonFields, ...authFields];
    }
    return [
      ...commonFields,
      {
        name: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        placeholder: "Enter your API key",
      },
    ];
  };

  if (!isOpen) return null;

  const formFields =
    mode === "edit"
      ? [
          {
            name: "displayName",
            label: "Connection Name",
            type: "text",
            required: true,
            placeholder: "Enter connection name",
          },
        ]
      : getFormFields();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-[700px] h-[600px] overflow-hidden rounded-2xl bg-theme-form/95 backdrop-blur-md shadow-2xl border border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between border-b border-white/20 dark:border-white/10 p-6">
          <div className="flex items-center gap-3">
            <img
              src={piece.logoUrl}
              alt={piece.displayName}
              className="h-8 w-8 rounded-xl object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://via.placeholder.com/32x32?text=?";
              }}
            />
            <div>
              <h2 className="text-lg font-semibold text-theme-primary">
                {mode === "edit"
                  ? `Edit ${piece.displayName} Connection`
                  : `Connect to ${piece.displayName}`}
              </h2>
              <p className="text-sm text-theme-secondary">
                {mode === "edit"
                  ? "Update your connection details"
                  : "Configure your connection settings"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-theme-primary transition-all duration-200 hover:bg-theme-input-focus"
          >
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="px-6 py-3 h-[83%] flex flex-col"
        >
          <div className="h-full overflow-y-auto space-y-4 pr-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
            {mode !== "edit" && piece.auth?.description && (
              <div className="mb-4 p-4 bg-[#b3a1ff]/10 rounded-xl border border-[#b3a1ff]/30">
                <h4 className="text-sm font-medium text-[#b3a1ff] mb-2">
                  Setup Instructions
                </h4>
                <div className="text-sm text-theme-primary whitespace-pre-line">
                  {piece.auth.description}
                </div>
              </div>
            )}
            {formFields.map((field) => (
              <div key={field.name}>
                <label className="mb-1.5 block text-sm font-medium text-theme-primary">
                  {field.label}
                  {field.required && (
                    <span className="text-[#ef4a45] ml-1">*</span>
                  )}
                </label>
                <input
                  {...form.register(field.name, {
                    required: field.required
                      ? `${field.label} is required`
                      : false,
                  })}
                  type={field.type}
                  placeholder={field.placeholder}
                  className="block w-full rounded-xl border border-white/20 dark:border-white/10 bg-theme-input px-3 py-2.5 text-sm text-theme-primary placeholder:text-theme-secondary outline-none transition-all duration-200 focus:border-[#b3a1ff] focus:ring-4 focus:ring-[#b3a1ff]/10"
                />
                {form.formState.errors[field.name] && (
                  <p className="mt-1 text-sm text-[#ef4a45]">
                    {form.formState.errors[field.name]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/20 dark:border-white/10 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-theme-secondary transition-all duration-200 hover:bg-theme-input-focus"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(
                (mode === "edit" ? isUpdating : isCreating) ||
                  !form.formState.isValid ||
                  (mode === "edit" &&
                    existingConnection &&
                    form.getValues("displayName").trim() ===
                      existingConnection.displayName.trim())
              )}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b3a1ff] px-5 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#a08fff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mode === "edit"
                ? isUpdating
                  ? "Updating..."
                  : "Update Connection"
                : isCreating
                ? "Creating..."
                : "Create Connection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
