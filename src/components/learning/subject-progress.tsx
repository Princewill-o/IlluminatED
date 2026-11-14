"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import styles from "./subjects.module.css";

import { loadSubjectProgress, type SubjectAttempt } from "@/lib/learning/actions";
import { findSubjectPack, type SubjectProduct } from "@/lib/learning/packs";


export function SubjectProgress({product}:{product:SubjectProduct}) {
  const [attempts,setAttempts] = useState<SubjectAttempt[]>([]);
  const [message,setMessage] = useState("Loading saved work…");
  useEffect(() => {
    let active = true;
    void loadSubjectProgress(product).then((progress) => {
      if (!active) return;
      setAttempts(progress.attempts);
      setMessage(progress.error ?? (progress.signedIn ? "Your recent topic practice and drafts." : "Sign in to save results and resume drafts across devices. Guests can practise every pack."));
    }).catch(() => {if (active) setMessage("Saved progress could not load. You can still open every topic.");});
    return () => {active=false;};
  },[product]);
  return <section className={styles.section}><h2>Your learning so far</h2><p>{message}</p>{attempts.length > 0 && <ul className={styles.history}>{attempts.slice(0,6).map((item) => <li key={item.id}><Link className="underline" href={`/${product}/${item.topic_slug}${item.assignment_id ? `?assignment=${item.assignment_id}` : ""}`}>{findSubjectPack(product,item.topic_slug)?.title ?? item.topic_slug}</Link> · {item.submitted_at ? `${item.score}/${item.max_score} quiz marks${item.mode === "race" ? ` · ${item.elapsed_seconds}s race` : ""}` : item.written_response ? "Resume written draft" : "Resume practice"}{item.written_response && item.submitted_at ? " · written response saved, ungraded" : ""}</li>)}</ul>}</section>;
}
