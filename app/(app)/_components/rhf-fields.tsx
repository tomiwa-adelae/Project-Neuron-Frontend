"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// React-hook-form-aware shadcn field wrappers. Each renders the standard
// FormField → FormItem/FormLabel/FormControl/FormMessage stack so every form in
// the app is a real shadcn form with inline (Zod-driven) validation messages.

type Base<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

function Req({ required }: { required?: boolean }) {
  return required ? <span className="ml-0.5 text-red-500">*</span> : null;
}

export function RHFText<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  required,
  type = "text",
  autoComplete,
}: Base<T> & { type?: string; autoComplete?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel>
              {label}
              <Req required={required} />
            </FormLabel>
          )}
          <FormControl>
            <Input
              type={type}
              inputMode={type === "email" ? "email" : undefined}
              autoComplete={autoComplete}
              placeholder={placeholder}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function RHFTextarea<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  required,
  rows = 3,
}: Base<T> & { rows?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel>
              {label}
              <Req required={required} />
            </FormLabel>
          )}
          <FormControl>
            <Textarea
              rows={rows}
              placeholder={placeholder}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function RHFNumber<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  required,
  unit,
  min,
  step,
}: Base<T> & { unit?: string; min?: number; step?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel>
              {label}
              <Req required={required} />
            </FormLabel>
          )}
          <FormControl>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                min={min}
                step={step}
                placeholder={placeholder}
                className={unit ? "pr-12" : undefined}
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? undefined : e.target.valueAsNumber,
                  )
                }
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
              {unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {unit}
                </span>
              )}
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function RHFDate<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
}: Base<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel>
              {label}
              <Req required={required} />
            </FormLabel>
          )}
          <FormControl>
            <Input
              type="date"
              value={field.value ? String(field.value).slice(0, 10) : ""}
              onChange={(e) =>
                field.onChange(e.target.value === "" ? undefined : e.target.value)
              }
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Options may be a plain string list or {value,label} pairs.
type Option = string | { value: string; label: string };
const optValue = (o: Option) => (typeof o === "string" ? o : o.value);
const optLabel = (o: Option) => (typeof o === "string" ? o : o.label);

export function RHFSelect<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "Select…",
  required,
  options,
}: Base<T> & { options: readonly Option[] }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel>
              {label}
              <Req required={required} />
            </FormLabel>
          )}
          <Select
            value={field.value ?? ""}
            onValueChange={field.onChange}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={optValue(o)} value={optValue(o)}>
                  {optLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function RHFSwitch<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: Base<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-3 rounded-md border border-input bg-background/50 px-3 py-2">
          <div className="space-y-0.5">
            {label && <FormLabel className="cursor-pointer">{label}</FormLabel>}
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch
              checked={!!field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
