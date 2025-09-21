import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "email" | "password" | "textarea" | "select" | "date" | "time";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  value?: string | number;
  onChange?: (value: string | number) => void;
  min?: number;
  max?: number;
  step?: number;
}

interface MedicalFormProps {
  title: string;
  subtitle?: string;
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  children?: ReactNode;
  className?: string;
}

const MedicalForm = ({
  title,
  subtitle,
  fields,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  isLoading = false,
  children,
  className
}: MedicalFormProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: Record<string, any> = {};
    
    fields.forEach(field => {
      const value = formData.get(field.id);
      if (field.type === "number") {
        data[field.id] = value ? Number(value) : null;
      } else {
        data[field.id] = value;
      }
    });
    
    onSubmit(data);
  };

  const renderField = (field: FormField) => {
    const baseProps = {
      id: field.id,
      name: field.id,
      required: field.required,
      placeholder: field.placeholder,
      defaultValue: field.value,
      className: "medical-input"
    };

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            {...baseProps}
            rows={4}
            className="medical-input resize-none"
          />
        );
      
      case "select":
        return (
          <select {...baseProps} className="medical-input">
            <option value="">Selecione...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case "number":
        return (
          <Input
            {...baseProps}
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );
      
      default:
        return (
          <Input
            {...baseProps}
            type={field.type}
          />
        );
    }
  };

  return (
    <Card className={cn("medical-card max-w-2xl mx-auto", className)}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div 
              key={field.id} 
              className={cn(
                "space-y-2",
                field.type === "textarea" && "md:col-span-2"
              )}
            >
              <Label 
                htmlFor={field.id}
                className="text-sm font-medium text-foreground"
              >
                {field.label}
                {field.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </div>

        {children && (
          <div className="pt-4 border-t border-border">
            {children}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
          <Button
            type="submit"
            disabled={isLoading}
            className="medical-button-primary flex-1 sm:flex-none"
          >
            {isLoading ? "Salvando..." : submitLabel}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 sm:flex-none"
            >
              {cancelLabel}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export default MedicalForm;