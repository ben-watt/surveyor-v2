import { z } from "zod";
import { SurveyImage } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";

export const SurveyImageSchema = z.object({
  path: z.string(),
  isArchived: z.boolean(),
  hasMetadata: z.boolean(),
});

export const ElementFormSchema = z.object({
  description: z.string().default(""),
  images: z.array(SurveyImageSchema).default([]),
});

export type ElementFormData = {
  description: string;
  images: SurveyImage[];
};

export const validateElementForm = (data: unknown): ElementFormData => {
  return ElementFormSchema.parse(data);
};

export const safeParseElementForm = (data: unknown) => {
  return ElementFormSchema.safeParse(data);
};