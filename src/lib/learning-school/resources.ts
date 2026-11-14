import "server-only";

import type { LearningProduct } from "./catalogue";

import { getSupabase } from "@/lib/social/server";

export interface ReviewedResource {
  id: string;
  product: LearningProduct;
  title: string;
  topic: string;
  exam_board: string | null;
  board_verified: boolean;
  body: string;
  source_url: string | null;
  reviewed_at: string;
}

export async function loadReviewedResources(product: LearningProduct | null = null, id: string | null = null): Promise<ReviewedResource[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("learning_reviewed_resources", { p_product: product, p_id: id });
  if (error) return [];
  return (data ?? []) as ReviewedResource[];
}
