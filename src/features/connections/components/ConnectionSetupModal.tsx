import { useEffect, useState, useCallback } from "react";
import { X, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { toastError, toastSuccess } from "../../../components/ui/Toast";
import { useContextStore } from "../../../app/store/context";
import { http } from "../../../shared/api";
import type { Connection } from "../../../types/connection";
import type { ActivePiece } from "../types/connection.types";
import { createOAuthAuthUrl } from "../services/oauthService";

type ConnectionSetupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  piece: ActivePiece;
  onConnectionCreated: (connection: Connection) => void;
  mode?: "create" | "edit";
  existingConnection?: Connection | null;
  onConnectionUpdated?: (connection: Connection) => void;
  onSuccessClose?: () => void;
};

type ConnectionFormData = {
  displayName: string;
  [key: string]: unknown;
};

type FieldDef = {
  name: string;
  label: string;
  type: "text" | "password" | "select" | "checkbox" | "number";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
};

export default function ConnectionSetupModal({
  isOpen,
  onClose,
  piece,
  onConnectionCreated,
  mode = "create",
  existingConnection,
  onConnectionUpdated,
  onSuccessClose,
}: ConnectionSetupModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [openSelect, setOpenSelect] = useState<string | null>(null);
  const currentProject = useContextStore((state) => state.currentProject);
  const currentPlatform = useContextStore((state) => state.currentPlatform);
  const isGithub =
    piece?.name?.toLowerCase().includes("github") ||
    piece?.displayName?.toLowerCase().includes("github");

  const form = useForm<ConnectionFormData>({
    defaultValues: { displayName: `${piece.displayName} Connection`, scope: "platform" },
  });
  const hasOAuthCode = !!form.watch("code");
  const selectedScope = (form.watch("scope") as string) || "platform";

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "edit" && existingConnection) {
      form.reset({ displayName: existingConnection.displayName, scope: "platform" });
    } else {
      form.reset({ displayName: `${piece.displayName} Connection`, scope: "platform" });
    }
  }, [isOpen, mode, existingConnection, piece.displayName, form]);

  // (auto-prefill removed to avoid hook ordering issue; defaults still appear in UI)

  const handleSubmit = async (data: ConnectionFormData) => {
    const scope = selectedScope;
    if (scope === "project" && !currentProject?.id) {
      toastError(
        "No project selected",
        "Please select a project to create a project-scoped connection"
      );
      return;
    }
    if (!currentPlatform?.id) {
      toastError(
        "No platform selected",
        "Please select a platform to create a connection"
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
      if (!currentProject?.id) {
        toastError(
          "No project selected",
          "Cannot update a connection without a project context"
        );
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
        }/api/projects/${currentProject.id}/connections/${
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
      const oauthCode = form.getValues("code");
      const safeDisplayName = (displayName || "").trim() || `${piece.displayName} Connection`;
      const requestBody = oauthCode
        ? {
            displayName: safeDisplayName,
            pieceName,
            type: "PLATFORM_OAUTH2",
            code: oauthCode,
            ...(scope === "project" && currentProject?.id
              ? { projectIds: [currentProject.id] }
              : {}),
          }
        : {
            displayName: safeDisplayName,
            pieceName,
            type: isGithub ? "BASIC_AUTH" : piece.auth?.type || "CUSTOM_AUTH",
            value: authValues,
            ...(scope === "project" && currentProject?.id
              ? { projectIds: [currentProject.id] }
              : {}),
          };
      const baseUrl =
        import.meta.env.VITE_BACKEND_API_URL ||
        import.meta.env.BACKEND_API_URL ||
        "";
      const url = `${baseUrl ? baseUrl.replace(/\/$/, "") : ""}/api/platforms/${
        currentPlatform.id
      }/connections`;
      const response = await http.post(url, requestBody);
      onConnectionCreated(response.data);
      toastSuccess(
        "Connection created",
        `${displayName} has been successfully created`
      );
      if (onSuccessClose) {
        onSuccessClose();
      } else {
        onClose();
      }
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

  const handleGoogleOAuth = async () => {
    try {
      const rawPieceName = piece.name.startsWith("@activepieces/piece-")
        ? piece.name
        : `@activepieces/piece-${piece.name}`;
      const { authUrl } = await createOAuthAuthUrl(rawPieceName);
      const code = await openPopupAndGetCode(authUrl);
      if (code) {
        form.setValue("code", code as unknown as string, { shouldValidate: true });
        toastSuccess("Code received", "Continue to create connection");
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to start OAuth flow";
      toastError("OAuth error", message);
    }
  };

  function openPopupAndGetCode(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const width = 500;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        url,
        "oauth_popup",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      if (!popup) return resolve(null);

      const onMessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; code?: string };
        if (data && data.type === "OAUTH_CODE" && data.code) {
          window.removeEventListener("message", onMessage);
          try { popup.close(); } catch {/* ignore */}
          resolve(data.code);
        }
      };
      window.addEventListener("message", onMessage);

      const timer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(timer);
            window.removeEventListener("message", onMessage);
            resolve(null);
            return;
          }
          const params = new URL(popup.location.href).searchParams;
          const code = params.get("code");
          if (code) {
            clearInterval(timer);
            window.removeEventListener("message", onMessage);
            popup.close();
            resolve(code);
          }
        } catch {
          // Cross-origin while on provider domain; ignore until it redirects back
        }
      }, 400);
    });
  }

  const getFormFields = useCallback((): FieldDef[] => {
    const commonFields: FieldDef[] = [
      {
        name: "displayName",
        label: "Connection Name",
        type: "text",
        required: true,
        placeholder: "Enter connection name",
      },
    ];

    if (isGithub) {
      return [
        ...commonFields,
        {
          name: "username",
          label: "Username",
          type: "text",
          required: true,
          placeholder: "Enter GitHub username",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
          placeholder: "Enter GitHub password",
        },
      ];
    }

    // If OAuth2 → no manual secret field; only pre-auth props (e.g., Salesforce environment)
    const isOAuth2 = piece.auth?.type === "OAUTH2";
    const hasProps = Boolean(piece.auth && piece.auth.props && Object.keys(piece.auth.props!).length > 0);

    // Map props to fields, supporting multiple prop types
    const mapPropsToFields = (): FieldDef[] => {
      const entries = Object.entries(piece.auth?.props || {});
      return entries.map(([key, prop]) => {
        const p = prop as {
          displayName?: string;
          required?: boolean;
          type?: string;
          defaultValue?: unknown;
          options?: { options?: Array<{ label?: string; value?: string | number }> };
        };
        const kind = String(prop.type || "SHORT_TEXT");
        if (kind === "STATIC_DROPDOWN") {
          const optionsArr: Array<{ label: string; value: string }> = (p.options?.options || []).map((opt) => ({
            label: String((opt?.label ?? opt?.value ?? "") as string | number),
            value: String((opt?.value ?? opt?.label ?? "") as string | number),
          }));
          return {
            name: key,
            label: p.displayName || key,
            type: "select",
            required: Boolean(p.required),
            options: optionsArr,
            defaultValue: p.defaultValue,
          } as FieldDef;
        }
        if (kind === "CHECKBOX") {
          return {
            name: key,
            label: p.displayName || key,
            type: "checkbox",
            required: Boolean(p.required),
            defaultValue: Boolean(p.defaultValue),
          } as FieldDef;
        }
        if (kind === "NUMBER") {
          return {
            name: key,
            label: p.displayName || key,
            type: "number",
            required: Boolean(p.required),
            placeholder: `Enter ${String(p.displayName || key).toLowerCase()}`,
            defaultValue: p.defaultValue,
          } as FieldDef;
        }
        if (kind === "SECRET_TEXT") {
          return {
            name: key,
            label: p.displayName || key,
            type: "password",
            required: Boolean(p.required),
            placeholder: `Enter ${String(p.displayName || key).toLowerCase()}`,
          } as FieldDef;
        }
        // Default to short text
        return {
          name: key,
          label: p.displayName || key,
          type: "text",
          required: Boolean(p.required),
          placeholder: `Enter ${String(p.displayName || key).toLowerCase()}`,
        } as FieldDef;
      });
    };

    if (isOAuth2) {
      if (hasProps) {
        return [...commonFields, ...mapPropsToFields()];
      }
      return [...commonFields];
    }

    // SECRET_TEXT without props: single token field using piece's display label
    if (piece.auth?.type === "SECRET_TEXT" && !hasProps) {
      return [
        ...commonFields,
        {
          name: "token",
          label: piece.auth.displayName || "API Key",
          type: "password",
          required: Boolean(piece.auth.required),
          placeholder: `Enter ${(piece.auth.displayName || "API Key").toLowerCase()}`,
        },
      ];
    }

    // CUSTOM_AUTH with props
    if (hasProps) {
      return [...commonFields, ...mapPropsToFields()];
    }

    // Fallback: only connection name
    return [...commonFields];
  }, [isGithub, piece]);

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
            {mode !== "edit" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-theme-primary">
                  Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => form.setValue("scope", "platform", { shouldDirty: true })}
                    className={`rounded-xl px-3 py-2 text-sm transition-all ${
                      selectedScope === "platform"
                        ? "bg-theme-primary text-theme-inverse"
                        : "border border-white/20 dark:border-white/10 bg-theme-input text-theme-primary hover:bg-theme-input-focus"
                    }`}
                  >
                    Platform
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue("scope", "project", { shouldDirty: true })}
                    className={`rounded-xl px-3 py-2 text-sm transition-all ${
                      selectedScope === "project"
                        ? "bg-theme-primary text-theme-inverse"
                        : "border border-white/20 dark:border-white/10 bg-theme-input text-theme-primary hover:bg-theme-input-focus"
                    }`}
                  >
                    This project
                  </button>
                </div>
              </div>
            )}
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

            <div>
              <button
                type="button"
                onClick={handleGoogleOAuth}
                className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-white/20 dark:border-white/10 bg-theme-input px-4 py-2.5 text-sm font-semibold text-theme-primary transition-all duration-200 hover:bg-theme-input-focus"
              >
                Continue with Google
              </button>
            </div>

            {/* Hidden fields to store OAuth code and scope */}
            <input type="hidden" {...form.register("code")} />
            <input type="hidden" {...form.register("scope")} />

            {(formFields as FieldDef[]).map((field: FieldDef) => (
              <div key={field.name}>
                <label className="mb-1.5 block text-sm font-medium text-theme-primary">
                  {field.label}
                  {field.required && (
                    <span className="text-[#ef4a45] ml-1">*</span>
                  )}
                </label>
                {field.type === "select" ? (
                  <div className="relative">
                    {/* Hidden input binds to form */}
                    <input
                      type="hidden"
                      {...form.register(field.name, {
                        required:
                          field.name === "displayName"
                            ? `${field.label} is required`
                            : !hasOAuthCode && Boolean(field.required)
                            ? `${field.label} is required`
                            : false,
                      })}
                      defaultValue={field.defaultValue as string | undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setOpenSelect((prev) => (prev === field.name ? null : field.name))}
                      className="w-full inline-flex items-center justify-between px-3 py-2.5 bg-theme-input border border-white/20 dark:border-white/10 rounded-2xl text-sm text-theme-primary hover:bg-theme-input-focus focus:ring-2 focus:ring-theme-primary/20"
                    >
                      <span className="truncate text-left">
                        {(() => {
                          const current = String((form.getValues(field.name) as string) || (field.defaultValue as string) || "");
                          const opt = (field.options || []).find((o) => o.value === current);
                          return opt ? opt.label : current || "Select option";
                        })()}
                      </span>
                      <ChevronDown size={16} className="text-theme-secondary ml-2" />
                    </button>
                    {openSelect === field.name && (
                      <>
                        <div className="absolute inset-0" onClick={() => setOpenSelect(null)} />
                        <div className="absolute z-[99999] mt-2 w-full overflow-hidden bg-theme-input backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl shadow-xl">
                          <div className="py-1 max-h-64 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-theme-secondary/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-theme-secondary/50">
                            {(field.options || []).map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  form.setValue(field.name, opt.value, { shouldValidate: true, shouldDirty: true });
                                  setOpenSelect(null);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm transition-all duration-200 ${
                                  String(form.getValues(field.name) || "") === opt.value
                                    ? "bg-[#b3a1ff] text-[#222222]"
                                    : "text-theme-primary hover:bg-theme-input-focus"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    {...form.register(field.name)}
                    defaultChecked={Boolean(field.defaultValue)}
                    className="rounded border-white/20 dark:border-white/10 bg-theme-input text-theme-primary focus:ring-[#b3a1ff]"
                  />
                ) : (
                  <input
                    {...form.register(field.name, {
                      required:
                        field.name === "displayName"
                          ? `${field.label} is required`
                          : !hasOAuthCode && Boolean(field.required)
                          ? `${field.label} is required`
                          : false,
                      valueAsNumber: field.type === "number",
                    })}
                    type={field.type}
                    placeholder={field.placeholder || ""}
                    defaultValue={field.defaultValue as string | number | undefined}
                    className="block w-full rounded-xl border border-white/20 dark:border-white/10 bg-theme-input px-3 py-2.5 text-sm text-theme-primary placeholder:text-theme-secondary outline-none transition-all duration-200 focus:border-[#b3a1ff] focus:ring-4 focus:ring-[#b3a1ff]/10"
                  />
                )}
                {(form.formState.errors as Record<string, { message?: string }>)[field.name] && (
                  <p className="mt-1 text-sm text-[#ef4a45]">
                    {String((form.formState.errors as Record<string, { message?: string }>)[field.name]?.message || "")}
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
                  (!hasOAuthCode && !form.formState.isValid) ||
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
