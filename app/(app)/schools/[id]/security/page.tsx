"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react"

import { getSchool, ApiError, type SchoolDetail } from "@/lib/api"
import { StatusBadge } from "../../../_components/status-badge"
import { SecurityAssessmentForm } from "../../../_components/security-assessment-form"

export default function SecurityAssessmentPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [data, setData] = useState<SchoolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getSchool(id)
      .then((d) => active && setData(d))
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof ApiError ? err.message : "Couldn't load this school."
        )
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto size-8 text-red-500" />
        <p className="mt-2 text-sm text-red-700">{error ?? "Not found."}</p>
      </div>
    )
  }

  const { school, session, security } = data

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Link
        href={`/schools/${id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="size-4" />
        {school.name}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-neutral-900">
            School Inspection
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {session ? `Session ${session.name}` : "No active session"} · Record
            what you physically observe across the compound.
          </p>
        </div>
        <StatusBadge status={security?.recordStatus ?? "NOT_STARTED"} />
      </div>

      {!session ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Capture is paused until an administrator configures the current
          academic session.
        </div>
      ) : (
        <SecurityAssessmentForm schoolId={id} initial={security} />
      )}
    </div>
  )
}
