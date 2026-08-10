'use client'

import { useEffect, useRef, useState, useCallback, type FormEvent } from 'react'
import { formatApiErrorMessage } from '../lib/formatApiError'
import { stripSensitiveQueryParams } from '../lib/stripSensitiveQuery'
import { CitizenSuccessModal, type SuccessOccurrencePayload } from './components/CitizenSuccessModal'
import { MyComplaintsPanel } from './components/MyComplaintsPanel'
import { CitizenPrivacyPanel } from './components/CitizenPrivacyPanel'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie, Legend,
    LineChart, Line, CartesianGrid
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Occurrence {
    id: string
    external_id?: string
    source?: string
    title: string
    description: string
    urgency: 'critical' | 'high' | 'medium' | 'low'
    status: 'open' | 'in_progress' | 'resolved' | 'canceled'
    priority_score: number
    latitude: number
    longitude: number
    secretariat_id: string | null
    category_id: string | null
    assigned_team?: string | null
    address: string | null
    number?: string | null
    neighborhood: string | null
    city?: string | null
    state?: string | null
    due_at: string | null
    created_at: string
    updated_at?: string
    resolved_at: string | null
    reporter_name: string | null
    reporter_role: string | null
    cep?: string | null
    sla_overdue_days?: number
    sla_escalation_level?: number
    recurrence_count?: number
    recurrence_level?: number
    recurrence_address_count?: number
    recurrence_topic_count?: number
    recurrence_geo_count?: number
}

interface HeatmapPoint {
    lat_cell: number
    lon_cell: number
    count: number
    weighted_score: number
}

/** Garante ponto no mapa: `&&` falha com latitude/longitude 0; API pode enviar número em string. */
function hasValidGeo(o: Pick<Occurrence, 'latitude' | 'longitude'>): boolean {
    const lat = Number(o.latitude)
    const lon = Number(o.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false
    if (lat === 0 && lon === 0) return false
    return true
}

function getOccurrenceLatLng(o: Pick<Occurrence, 'latitude' | 'longitude'>): [number, number] | null {
    if (!hasValidGeo(o)) return null
    return [Number(o.latitude), Number(o.longitude)]
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function formatOccurrenceCreatedAt(createdAt: string | null | undefined): string {
    if (!createdAt || !String(createdAt).trim()) {
        return 'Registrado em: data não informada'
    }
    const parsed = new Date(createdAt)
    if (Number.isNaN(parsed.getTime())) {
        return 'Registrado em: data não informada'
    }
    const datePart = parsed.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
    const timePart = parsed.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
    return `Registrado em: ${datePart} às ${timePart}`
}

interface Secretariat {
    id: string
    title: string
    sigla: string
    phone: string
    email: string
    address: string
}

interface Category {
    id: string
    title: string
    description: string
    secretariat_id: string
    sla_days?: number
}

interface UserInfo {
    id: string
    name: string
    email: string
    image?: string | null
    role: string
    secretariat_id?: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL ?? '/garca-cidadao-api'
const FORCE_LOGIN_KEY = 'govForceLogin'
const TRIAGE_HANDLED_STORAGE_PREFIX = 'govTriageHandled:'
const TRIAGE_HANDLED_STORAGE_GLOBAL = 'govTriageHandled:global'
/** Manter títulos alinhados com app/social_risk_categories.py na API (criação ao subir). */
const SOCIAL_RISK_CATEGORY_TITLES = [
    'Buracos nas ruas e falta de recapeamento.',
    'Demora em consultas médicas nos postos de saúde.',
    'Falta de médicos ou especialistas na rede pública.',
    'Falta de medicamentos nas farmácias municipais.',
    'Lixo acumulado ou coleta irregular.',
    'Mato alto em terrenos, praças e áreas públicas.',
    'Iluminação pública quebrada ou ruas escuras.',
    'Obras públicas paradas ou demoradas.',
    'Aumento de IPTU ou outras taxas municipais.',
    'Falta de vagas em creches.',
    'Problemas no transporte público (atraso, poucos horários).',
    'Estradas rurais ruins (muito comum em cidades do interior).',
    'Falta de manutenção em praças e parques.',
    'Enchentes ou drenagem ruim em dias de chuva.',
    'Demora para consertar problemas urbanos (poste, buraco, vazamento etc.).',
    'Falta de segurança ou pouca presença da guarda municipal.',
    'Nepotismo ou cargos para aliados políticos.',
    'Falta de transparência nos gastos públicos.',
    'Promessas de campanha não cumpridas.',
    'Prefeitura não responder pedidos da população (protocolos, redes sociais, ouvidoria).',
] as const

const URGENCY_LABEL: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
}
const URGENCY_COLOR: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
}
const STATUS_LABEL: Record<string, string> = {
    open: 'Ativa',
    in_progress: 'Em execução',
    resolved: 'Encerrada',
    canceled: 'Cancelada',
}
const STATUS_COLOR: Record<string, string> = {
    open: '#3b82f6',
    in_progress: '#8b5cf6',
    resolved: '#22c55e',
    canceled: '#94a3b8',
}
const URGENCY_RANK: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
}

const USER_ROLE_LABEL: Record<string, string> = {
    admin: 'Admin',
    secretary: 'Secretário',
    prefeito: 'Prefeito',
    citizen: 'Cidadão',
}
const RECURRENCE_RING_COLOR: Record<number, string> = {
    1: '#38bdf8',
    2: '#f59e0b',
    3: '#ef4444',
    4: '#7c3aed',
}
const HEADER_LOGO_CANDIDATES = [
    '/garca-cidadao/logo_cidadao.png',
    '/logo_cidadao.png',
    '/garca-cidadao/logo_cidadao.svg',
    '/logo_cidadao.svg',
    '/garca-cidadao/logo_garca_cidade.svg',
    '/logo_garca_cidade.svg',
]

function getHeatBarColor(heatScore: number): string {
    if (heatScore >= 0.75) return '#b91c1c'
    if (heatScore >= 0.55) return '#ef4444'
    if (heatScore >= 0.4) return '#f97316'
    if (heatScore >= 0.25) return '#f59e0b'
    if (heatScore >= 0.12) return '#eab308'
    return '#60a5fa'
}

function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim()
}

const SOCIAL_RISK_CATEGORY_KEYS = new Set(SOCIAL_RISK_CATEGORY_TITLES.map((title) => normalizeText(title)))

function isSecretaryRole(role: string | null | undefined): boolean {
    const normalized = (role || '').toLowerCase().trim()
    return normalized === 'secretary' || normalized === 'secretario'
}

function isMayorRole(role: string | null | undefined): boolean {
    return (role || '').toLowerCase().trim() === 'prefeito'
}

function hasSecretaryLikePermissions(role: string | null | undefined): boolean {
    return isSecretaryRole(role) || isMayorRole(role)
}

function resolveEffectiveRole(role: string | null | undefined, secretariatId?: string | null): string {
    const normalized = (role || '').toLowerCase().trim()
    if (normalized === 'admin' && secretariatId) return 'prefeito'
    return normalized
}

/** Painel administrativo só para estes papéis; todo o resto é experiência cidadão (denúncia / Boca no Trombone). */
function isStaffRole(role: string | null | undefined): boolean {
    const n = (role || '').toLowerCase().trim()
    return n === 'admin' || n === 'prefeito' || n === 'secretary' || n === 'secretario'
}

function isCitizenReporterRole(role: string | null | undefined): boolean {
    const normalized = (role || '').toLowerCase().trim()
    return normalized === 'citizen' || normalized === 'cidadao' || normalized === 'cidadão' || normalized === 'usuario' || normalized === 'comum'
}

function getTriageFingerprint(occ: Pick<Occurrence, 'title' | 'address' | 'number' | 'created_at'>): string {
    const title = (occ.title || '').trim().toLowerCase()
    const address = (occ.address || '').trim().toLowerCase()
    const number = (occ.number || '').trim().toLowerCase()
    const created = (occ.created_at || '').slice(0, 19)
    return `${title}|${address}|${number}|${created}`
}

const TRIAGED_MARKER_TEAM = '__triaged__'

function resolveUserImageUrl(image: string | null | undefined): string {
    const raw = (image || '').trim()
    if (!raw) return ''
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:') || raw.startsWith('/')) {
        return raw
    }
    return `/images/users/${encodeURIComponent(raw)}`
}

function UserAvatar({ name, image, size = 38 }: { name: string; image?: string | null; size?: number }) {
    const [failed, setFailed] = useState(false)
    const src = resolveUserImageUrl(image)
    const showImage = Boolean(src) && !failed
    return (
        <div style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: '#3b82f6',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: '1rem',
            overflow: 'hidden',
        }}>
            {showImage
                ? <img src={src} alt={name} onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : name.charAt(0).toUpperCase()}
        </div>
    )
}

function getOccurrenceAddress(occ: Occurrence): string {
    const primary = [occ.address, occ.number, occ.neighborhood, occ.city, occ.state]
        .filter(Boolean)
        .join(', ')
        .trim()
    if (primary) return primary

    const match = occ.description?.match(/Endere[cç]o informado:\s*([\s\S]+)$/i)
    if (match?.[1]) return match[1].trim()

    return 'Endereço não informado'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLegacyGovToken(): string {
    if (typeof window === 'undefined') return ''
    const rawToken = localStorage.getItem('token') ?? localStorage.getItem('auth_token')
    if (rawToken) return rawToken

    const rawAuth = localStorage.getItem('auth')
    if (!rawAuth) return ''
    try {
        const auth = JSON.parse(rawAuth) as { token?: string }
        return auth?.token || ''
    } catch (_err) {
        return ''
    }
}

function isEmbeddedGarcaApp(): boolean {
    if (typeof window === 'undefined') return false
    if (sessionStorage.getItem('govEmbedded') === '1') return true
    try {
        const params = new URLSearchParams(window.location.search)
        return params.get('embedded') === '1' || params.get('from') === 'prefeitura_app'
    } catch (_err) {
        return false
    }
}

function resolveGovAuthToken(): string {
    const gov = getGovToken()
    if (gov) return gov
    return getLegacyGovToken()
}

function getGovToken(): string {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('govToken') ?? ''
}

function getAuthHeaders(): Record<string, string> {
    const token = getGovToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchJsonWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 8000) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const res = await fetch(url, { headers, signal: controller.signal })
        if (!res.ok) {
            if (typeof window !== 'undefined') {
                console.warn('[GovCidadao]', url, 'HTTP', res.status)
            }
            return null
        }
        return await res.json()
    } catch (_err) {
        return null
    } finally {
        clearTimeout(timeoutId)
    }
}

type GovJsonErr = { ok: false; message: string }
type GovJsonOk = { ok: true; data: unknown }
type GovJsonDeleteOk = { ok: true }

async function postJsonWithTimeout(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    timeoutMs = 12000,
): Promise<GovJsonErr | GovJsonOk> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        })
        const payload = await res.json().catch(() => null)
        if (!res.ok) {
            const message: string =
                formatApiErrorMessage(payload?.detail) ||
                (typeof payload?.message === 'string' ? payload.message : '') ||
                `Erro HTTP ${res.status}` ||
                'Erro na requisição.'
            return { ok: false, message }
        }
        return { ok: true, data: payload }
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            return { ok: false, message: 'A API demorou para responder. Tente novamente em alguns segundos.' }
        }
        return { ok: false, message: 'Falha de conexão com a API.' }
    } finally {
        clearTimeout(timeoutId)
    }
}

async function patchJsonWithTimeout(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    timeoutMs = 12000,
): Promise<GovJsonErr | GovJsonOk> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        })
        const payload = await res.json().catch(() => null)
        if (!res.ok) {
            const message: string =
                formatApiErrorMessage(payload?.detail) ||
                (typeof payload?.message === 'string' ? payload.message : '') ||
                `Erro HTTP ${res.status}` ||
                'Erro na requisição.'
            return { ok: false, message }
        }
        return { ok: true, data: payload }
    } catch (_err) {
        return { ok: false, message: 'Falha de conexão com a API.' }
    } finally {
        clearTimeout(timeoutId)
    }
}

async function putJsonWithTimeout(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    timeoutMs = 12000,
): Promise<GovJsonErr | GovJsonOk> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        })
        const payload = await res.json().catch(() => null)
        if (!res.ok) {
            const message: string =
                formatApiErrorMessage(payload?.detail) ||
                (typeof payload?.message === 'string' ? payload.message : '') ||
                `Erro HTTP ${res.status}` ||
                'Erro na requisição.'
            return { ok: false, message }
        }
        return { ok: true, data: payload }
    } catch (_err) {
        return { ok: false, message: 'Falha de conexão com a API.' }
    } finally {
        clearTimeout(timeoutId)
    }
}

async function deleteJsonWithTimeout(
    url: string,
    headers: Record<string, string>,
    timeoutMs = 12000,
): Promise<GovJsonErr | GovJsonDeleteOk> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(url, {
            method: 'DELETE',
            headers,
            signal: controller.signal,
        })
        const payload = await res.json().catch(() => null)
        if (!res.ok) {
            const message: string =
                formatApiErrorMessage(payload?.detail) ||
                (typeof payload?.message === 'string' ? payload.message : '') ||
                `Erro HTTP ${res.status}` ||
                'Erro na requisição.'
            return { ok: false, message }
        }
        return { ok: true }
    } catch (_err) {
        return { ok: false, message: 'Falha de conexão com a API.' }
    } finally {
        clearTimeout(timeoutId)
    }
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function HeatmapView({
    points,
    occurrences,
    categories,
    allowHeatmapApiFallback = false,
}: {
    points: HeatmapPoint[]
    occurrences: Occurrence[]
    categories: Category[]
    allowHeatmapApiFallback?: boolean
}) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstance = useRef<unknown>(null)
    const layersRef = useRef<unknown[]>([])
    const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null)
    const [isExpanded, setIsExpanded] = useState(false)
    const navigableOccs = occurrences.filter(hasValidGeo)
    const categoryTitleById = useCallback((categoryId: string | null | undefined) => {
        if (!categoryId) return ''
        return categories.find((c) => c.id === categoryId)?.title || ''
    }, [categories])

    const focusOccurrenceOnMap = useCallback((occ: Occurrence) => {
        const coords = getOccurrenceLatLng(occ)
        if (!mapInstance.current || !coords) return
        try {
            ; (mapInstance.current as Record<string, Function>).setView(coords, 16)
        } catch (_err) {
            // noop
        }
    }, [])

    const selectedIndex = selectedOccurrence
        ? navigableOccs.findIndex((o) => o.id === selectedOccurrence.id)
        : -1

    const goToOccurrence = useCallback((direction: 'prev' | 'next') => {
        if (navigableOccs.length === 0) return

        let targetIndex = 0
        if (selectedIndex >= 0) {
            targetIndex = direction === 'next'
                ? (selectedIndex + 1) % navigableOccs.length
                : (selectedIndex - 1 + navigableOccs.length) % navigableOccs.length
        } else {
            targetIndex = direction === 'next' ? 0 : navigableOccs.length - 1
        }

        const target = navigableOccs[targetIndex]
        setSelectedOccurrence(target)
        focusOccurrenceOnMap(target)
    }, [focusOccurrenceOnMap, navigableOccs, selectedIndex])

    useEffect(() => {
        if (!selectedOccurrence) return
        if (!navigableOccs.some((o) => o.id === selectedOccurrence.id)) {
            setSelectedOccurrence(null)
        }
    }, [navigableOccs, selectedOccurrence])

    useEffect(() => {
        if (!mapRef.current) return

        // Retry until Leaflet is loaded from CDN
        const init = () => {
            const L = (window as unknown as { L?: Record<string, (...args: unknown[]) => unknown> }).L
            if (!L) { setTimeout(init, 300); return }

            if (!mapInstance.current) {
                mapInstance.current = (L.map as Function)(mapRef.current, { zoomControl: true, scrollWheelZoom: true })
                    ; (mapInstance.current as Record<string, Function>).setView([-22.2275, -49.7547], 13)
                    ; (L.tileLayer as Function)('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                        maxZoom: 19,
                    }).addTo(mapInstance.current)
            }

            // Clear old layers
            ; (layersRef.current as unknown[]).forEach((l) => {
                try { (mapInstance.current as Record<string, Function>).removeLayer(l) } catch (_) { }
            })
            layersRef.current = []

            // Heat layer: ocorrências com lat/lon; fallback da API só sem filtros locais ativos.
            const heatOccs = occurrences.filter(hasValidGeo)
            const apiBucketHeat = allowHeatmapApiFallback
                ? points.filter((p) => Number.isFinite(Number(p.lat_cell)) && Number.isFinite(Number(p.lon_cell)))
                : []
            const heatLayerFn = (L as Record<string, unknown>).heatLayer as Function | undefined

            if (heatOccs.length > 0 && heatLayerFn) {
                const maxScore = Math.max(...heatOccs.map((o) => o.priority_score), 1)
                const heatData = heatOccs
                    .map((o) => {
                        const coords = getOccurrenceLatLng(o)
                        return coords ? [coords[0], coords[1], o.priority_score / maxScore] as [number, number, number] : null
                    })
                    .filter((item): item is [number, number, number] => item !== null)
                if (heatData.length > 0) {
                    const heat = heatLayerFn(heatData, {
                        radius: 35, blur: 22, maxZoom: 18, max: 1.0,
                        gradient: { 0.0: '#22c55e', 0.3: '#eab308', 0.65: '#f97316', 1.0: '#ef4444' },
                    }).addTo(mapInstance.current)
                    layersRef.current.push(heat)
                }
            } else if (apiBucketHeat.length > 0 && heatLayerFn) {
                const maxW = Math.max(...apiBucketHeat.map((p) => p.weighted_score), 1)
                const heatData = apiBucketHeat.map((p) => [Number(p.lat_cell), Number(p.lon_cell), p.weighted_score / maxW])
                const heat = heatLayerFn(heatData, {
                    radius: 38, blur: 24, maxZoom: 18, max: 1.0,
                    gradient: { 0.0: '#22c55e', 0.3: '#eab308', 0.65: '#f97316', 1.0: '#ef4444' },
                }).addTo(mapInstance.current)
                layersRef.current.push(heat)
            }

            // Marcadores por ocorrência (deduplicados por id)
            const renderedOccurrenceIds = new Set<string>()
            heatOccs.forEach((occ) => {
                if (renderedOccurrenceIds.has(occ.id)) return
                renderedOccurrenceIds.add(occ.id)

                const coords = getOccurrenceLatLng(occ)
                if (!coords) return

                const color = URGENCY_COLOR[occ.urgency] ?? '#64748b'
                const recurrenceLevel = occ.recurrence_level ?? 0
                const ringColor = RECURRENCE_RING_COLOR[recurrenceLevel] ?? '#38bdf8'
                const ringSize = recurrenceLevel > 0 ? 18 + (recurrenceLevel * 3) : 0
                const categoryTitle = categoryTitleById(occ.category_id)
                const hasSocialRisk = SOCIAL_RISK_CATEGORY_KEYS.has(normalizeText(categoryTitle))
                const icon = (L.divIcon as Function)({
                    html: `<div style="position:relative;width:24px;height:30px;display:flex;align-items:flex-end;justify-content:center">
            ${hasSocialRisk ? `<div style="position:absolute;bottom:9px;width:34px;height:34px;border-radius:50%;background:rgba(239,68,68,.28);box-shadow:0 0 0 6px rgba(239,68,68,.12),0 0 18px rgba(239,68,68,.45)"></div>` : ''}
            ${recurrenceLevel > 0 ? `<div style="position:absolute;bottom:9px;width:${ringSize}px;height:${ringSize}px;border:2px solid ${ringColor};border-radius:50%;opacity:.85;box-shadow:0 0 0 1px rgba(255,255,255,.6)"></div>` : ''}
            <div style="position:relative;width:16px;height:16px;background:${color};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 5px rgba(0,0,0,.35)">
              <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(45deg);width:5px;height:5px;background:#fff;border-radius:50%"></div>
            </div>
          </div>`,
                    className: '', iconSize: [24, 30], iconAnchor: [12, 30], popupAnchor: [0, -28],
                })
                const addr = escapeHtml(getOccurrenceAddress(occ))
                const createdLabel = escapeHtml(formatOccurrenceCreatedAt(occ.created_at))
                const popup = `<div style="min-width:180px;font-family:sans-serif">
          <div style="font-weight:700;font-size:.9rem;margin-bottom:4px">${escapeHtml(occ.title)}</div>
          <div style="font-size:.75rem;color:#64748b;margin-bottom:4px">📍 ${addr}</div>
          <div style="font-size:.72rem;color:#475569;margin-bottom:6px">${createdLabel}</div>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            <span style="background:${color};color:white;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700">${URGENCY_LABEL[occ.urgency] ?? occ.urgency}</span>
            <span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:999px;font-size:.7rem">${STATUS_LABEL[occ.status] ?? occ.status}</span>
            ${recurrenceLevel > 0 ? `<span style="background:${ringColor};color:white;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700">Recorrência N${recurrenceLevel}</span>` : ''}
            ${hasSocialRisk ? `<span style="background:#ef4444;color:white;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:700">Risco rede social</span>` : ''}
          </div>
        </div>`
                const marker = (L.marker as Function)(coords, { icon })
                    .bindPopup(popup, { maxWidth: 240 })
                    .addTo(mapInstance.current)
                if ((marker as { bindTooltip?: (...args: unknown[]) => unknown }).bindTooltip) {
                    const hoverLines = [
                        `<strong>${escapeHtml(occ.title)}</strong>`,
                        createdLabel,
                        hasSocialRisk ? 'Risco iminente de denúncias em redes sociais' : '',
                    ].filter(Boolean).join('<br/>')
                    ; (marker as { bindTooltip: (...args: unknown[]) => unknown }).bindTooltip(
                        `<div style="font-size:.72rem;line-height:1.35">${hoverLines}</div>`,
                        { direction: 'top', sticky: true, opacity: 0.95, offset: [0, -22] },
                    )
                }
                ; (marker as { on?: (event: string, handler: () => void) => void }).on?.('click', () => {
                    setSelectedOccurrence(occ)
                })
                layersRef.current.push(marker)
            })

            if (heatOccs.length === 0 && apiBucketHeat.length > 0) {
                apiBucketHeat.forEach((p) => {
                    const cm = (L.circleMarker as Function)(
                        [Number(p.lat_cell), Number(p.lon_cell)],
                        {
                            radius: 6 + Math.min(p.count, 16),
                            color: '#1d4ed8',
                            weight: 2,
                            fillColor: '#fb923c',
                            fillOpacity: 0.45,
                        },
                    )
                        .bindPopup(
                            `<div style="font-size:.78rem;min-width:140px"><strong>Área agregada</strong><br/>${p.count} ocorrência(s) · peso ${p.weighted_score}</div>`,
                            { maxWidth: 240 },
                        )
                        .addTo(mapInstance.current)
                    layersRef.current.push(cm)
                })
            }

            if (heatOccs.length > 0) {
                const boundsCoords = heatOccs
                    .map((o) => getOccurrenceLatLng(o))
                    .filter((coords): coords is [number, number] => coords !== null)
                if (boundsCoords.length > 0) {
                    const bounds = (L.latLngBounds as Function)(boundsCoords)
                    ; (mapInstance.current as Record<string, Function>).fitBounds(bounds, { padding: [30, 30], maxZoom: 15 })
                }
            } else if (apiBucketHeat.length > 0) {
                const bounds = (L.latLngBounds as Function)(apiBucketHeat.map((p) => [Number(p.lat_cell), Number(p.lon_cell)]))
                    ; (mapInstance.current as Record<string, Function>).fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
            }
        }
        init()
    }, [points, occurrences, categoryTitleById, allowHeatmapApiFallback])

    useEffect(() => {
        const previousOverflow = document.body.style.overflow
        if (isExpanded) {
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [isExpanded])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isExpanded) {
                setIsExpanded(false)
            }
            if (event.key === 'ArrowRight') {
                goToOccurrence('next')
            }
            if (event.key === 'ArrowLeft') {
                goToOccurrence('prev')
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [goToOccurrence, isExpanded])

    useEffect(() => {
        if (!mapInstance.current) return
        setTimeout(() => {
            try {
                ; (mapInstance.current as Record<string, Function>).invalidateSize()
            } catch (_err) {
                // noop
            }
        }, 80)
    }, [isExpanded])

    return (
        <>
            <div
                style={{
                    position: isExpanded ? 'fixed' : 'relative',
                    inset: isExpanded ? '14px' : undefined,
                    zIndex: isExpanded ? 1000 : 1,
                    background: isExpanded ? '#0f172a' : 'transparent',
                    borderRadius: isExpanded ? '12px' : '8px',
                    border: isExpanded ? '1px solid #334155' : 'none',
                    padding: isExpanded ? '10px' : 0,
                    boxShadow: isExpanded ? '0 20px 45px rgba(15,23,42,.45)' : 'none',
                }}
            >
                <div style={{ position: 'absolute', top: isExpanded ? '14px' : '8px', right: isExpanded ? '14px' : '8px', zIndex: 1001, display: 'flex', gap: '6px' }}>
                    <button
                        type="button"
                        onClick={() => setIsExpanded((prev) => !prev)}
                        style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,.95)',
                            color: '#334155',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        {isExpanded ? 'Fechar tela cheia' : 'Expandir mapa'}
                    </button>
                </div>
                <div style={{ position: 'absolute', top: isExpanded ? '14px' : '8px', left: isExpanded ? '14px' : '8px', zIndex: 1001, display: 'flex', gap: '6px' }}>
                    <button
                        type="button"
                        onClick={() => goToOccurrence('prev')}
                        disabled={navigableOccs.length === 0}
                        style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,.95)',
                            color: '#334155',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        ← Anterior
                    </button>
                    <button
                        type="button"
                        onClick={() => goToOccurrence('next')}
                        disabled={navigableOccs.length === 0}
                        style={{
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,.95)',
                            color: '#334155',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Próxima →
                    </button>
                </div>
                <div ref={mapRef} id="heatmap-container"
                    style={{
                        height: isExpanded ? 'calc(100vh - 48px)' : '300px',
                        width: '100%',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        zIndex: 1,
                    }}
                />
            </div>

            {selectedOccurrence && (
                <div style={{
                    marginTop: '10px',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${URGENCY_COLOR[selectedOccurrence.urgency] ?? '#3b82f6'}`,
                    borderRadius: '8px',
                    padding: '10px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,.06)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                            {selectedOccurrence.title}
                            {selectedIndex >= 0 && (
                                <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                    ({selectedIndex + 1}/{navigableOccs.length})
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                type="button"
                                onClick={() => goToOccurrence('prev')}
                                style={{
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    background: '#f8fafc',
                                    color: '#475569',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                }}
                            >
                                ←
                            </button>
                            <button
                                type="button"
                                onClick={() => goToOccurrence('next')}
                                style={{
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    background: '#f8fafc',
                                    color: '#475569',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                }}
                            >
                                →
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedOccurrence(null)}
                                style={{
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '2px 8px',
                                    background: '#f8fafc',
                                    color: '#475569',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Fechar
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                        📍 {getOccurrenceAddress(selectedOccurrence)}
                    </div>

                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#475569' }}>
                        {formatOccurrenceCreatedAt(selectedOccurrence.created_at)}
                    </div>

                    {selectedOccurrence.description && (
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#334155' }}>
                            {selectedOccurrence.description}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                            background: URGENCY_COLOR[selectedOccurrence.urgency] ?? '#64748b',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '.7rem',
                            fontWeight: 700
                        }}>
                            {URGENCY_LABEL[selectedOccurrence.urgency] ?? selectedOccurrence.urgency}
                        </span>
                        <span style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '.7rem'
                        }}>
                            {STATUS_LABEL[selectedOccurrence.status] ?? selectedOccurrence.status}
                        </span>
                        <span style={{
                            background: '#ecfeff',
                            color: '#0e7490',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '.7rem',
                            fontWeight: 600
                        }}>
                            Score {selectedOccurrence.priority_score}
                        </span>
                        {(selectedOccurrence.recurrence_level ?? 0) > 0 && (
                            <span style={{
                                background: RECURRENCE_RING_COLOR[selectedOccurrence.recurrence_level ?? 1] ?? '#38bdf8',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '.7rem',
                                fontWeight: 700,
                            }}>
                                Recorrência {selectedOccurrence.recurrence_count ?? 0} (nível {selectedOccurrence.recurrence_level})
                            </span>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Occurrence Card ──────────────────────────────────────────────────────────
function OccurrenceCard({ occ, onClick }: { occ: Occurrence; onClick?: (occ: Occurrence) => void }) {
    const urgColor = URGENCY_COLOR[occ.urgency] ?? '#64748b'
    const statusColor = STATUS_COLOR[occ.status] ?? '#94a3b8'
    const role = occ.reporter_role === 'secretario' ? 'Secretário' : occ.reporter_role === 'cidadao' ? 'Cidadão' : occ.reporter_role ?? 'Não informado'
    const bg = occ.urgency === 'critical' ? '#fff1f2' : occ.urgency === 'medium' ? '#fefce8' : 'white'
    return (
        <div
            onClick={() => onClick?.(occ)}
            style={{
                background: bg,
                border: `1px solid ${urgColor}30`,
                borderLeft: `4px solid ${urgColor}`,
                borderRadius: '6px',
                padding: '10px 12px',
                marginBottom: '8px',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', marginBottom: '4px' }}>{occ.title}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{ background: statusColor, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>{STATUS_LABEL[occ.status] ?? occ.status}</span>
                <span style={{ background: urgColor, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>{URGENCY_LABEL[occ.urgency] ?? occ.urgency}</span>
                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>score {occ.priority_score}</span>
                {(occ.sla_escalation_level ?? 0) > 0 && (
                    <span style={{ background: '#fff7ed', color: '#9a3412', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                        SLA +{occ.sla_overdue_days ?? 0}d (nível {occ.sla_escalation_level})
                    </span>
                )}
                {(occ.recurrence_level ?? 0) > 0 && (
                    <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                        Recorrência {occ.recurrence_count ?? 0} (nível {occ.recurrence_level})
                    </span>
                )}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Enviado por: {role}</div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'ocorrencia' | 'minhas' | 'privacidade' | 'categorias' | 'secretarias' | 'usuarios'>('ocorrencia')
    const [successModalOpen, setSuccessModalOpen] = useState(false)
    const [successOccurrence, setSuccessOccurrence] = useState<SuccessOccurrencePayload | null>(null)
    const [deepLinkOccurrenceId, setDeepLinkOccurrenceId] = useState<string | null>(null)
    const [unreadNotifCount, setUnreadNotifCount] = useState(0)
    const [scope, setScope] = useState<'all' | 'mine'>('all')
    const [user, setUser] = useState<UserInfo | null>(null)
    const [occurrences, setOccurrences] = useState<Occurrence[]>([])
    const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([])
    const [secretariats, setSecretariats] = useState<Secretariat[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [usersList, setUsersList] = useState<UserInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [secretariatFilter, setSecretariatFilter] = useState('todas')
    const [neighborhoodFilter, setNeighborhoodFilter] = useState('')
    const [occForm, setOccForm] = useState({
        source: 'internal',
        title: '',
        description: '',
        urgency: 'medium',
        secretariat_id: '',
        category_id: '',
        cep: '',
        address: '',
        number: '',
        neighborhood: '',
        city: 'Garça',
        state: 'SP',
    })
    const [catForm, setCatForm] = useState({
        title: '',
        description: '',
        secretariat_id: '',
        sla_days: 5,
    })
    const [secForm, setSecForm] = useState({
        title: '',
        sigla: '',
        phone: '',
        email: '',
        address: '',
    })
    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        image: '',
        password: '',
        role: '',
        secretariat_id: '',
    })
    const [userSearch, setUserSearch] = useState('')
    const [occurrenceSearch, setOccurrenceSearch] = useState('')
    const [secretariatSearch, setSecretariatSearch] = useState('')
    const [editingOccurrenceId, setEditingOccurrenceId] = useState<string | null>(null)
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
    const [editingSecretariatId, setEditingSecretariatId] = useState<string | null>(null)
    const [editingUserId, setEditingUserId] = useState<string | null>(null)
    const [formMessage, setFormMessage] = useState('')
    const [formError, setFormError] = useState('')
    const [submittingOccurrence, setSubmittingOccurrence] = useState(false)
    const [submittingCategory, setSubmittingCategory] = useState(false)
    const [importingRiskCategories, setImportingRiskCategories] = useState(false)
    const [submittingSecretariat, setSubmittingSecretariat] = useState(false)
    const [submittingUser, setSubmittingUser] = useState(false)
    const [meReady, setMeReady] = useState(false)
    const profileLandingRef = useRef(false)
    const [loadingCep, setLoadingCep] = useState(false)
    const [checkingNewOccurrences, setCheckingNewOccurrences] = useState(false)
    const [authChecked, setAuthChecked] = useState(false)
    const [embeddedAuthFailed, setEmbeddedAuthFailed] = useState(false)
    const [selectedListOccurrence, setSelectedListOccurrence] = useState<Occurrence | null>(null)
    const [statusDraft, setStatusDraft] = useState<Occurrence['status']>('open')
    const [updatingOccurrenceStatus, setUpdatingOccurrenceStatus] = useState(false)
    const [triageOccurrence, setTriageOccurrence] = useState<Occurrence | null>(null)
    const [triageStatusDraft, setTriageStatusDraft] = useState<Occurrence['status']>('open')
    const [triageUrgencyDraft, setTriageUrgencyDraft] = useState<Occurrence['urgency']>('medium')
    const [triageSaving, setTriageSaving] = useState(false)
    const [kpiListFilter, setKpiListFilter] = useState<'all' | 'critical' | 'overdue' | 'resolved' | null>(null)
    const [triageHandledLoaded, setTriageHandledLoaded] = useState(false)
    const [headerLogoIndex, setHeaderLogoIndex] = useState(0)
    const triageDeferredIdsRef = useRef<Set<string>>(new Set())
    const triageHandledIdsRef = useRef<Set<string>>(new Set())
    const triageHandledFingerprintsRef = useRef<Set<string>>(new Set())

    const persistHandledTriage = useCallback((nextIds: Set<string>, nextFingerprints: Set<string>) => {
        if (typeof window === 'undefined') return
        const storageKey = `${TRIAGE_HANDLED_STORAGE_PREFIX}${user?.id || user?.email || 'anon'}`
        const payload = JSON.stringify({
            ids: Array.from(nextIds),
            fingerprints: Array.from(nextFingerprints),
        })
        try {
            localStorage.setItem(TRIAGE_HANDLED_STORAGE_GLOBAL, payload)
            if (user?.id || user?.email) {
                localStorage.setItem(storageKey, payload)
            }
        } catch (_err) {
            // noop
        }
    }, [user?.email, user?.id])

    useEffect(() => {
        let cancelled = false
        const verifySession = async () => {
            stripSensitiveQueryParams()
            const embedded = isEmbeddedGarcaApp()
            const token = resolveGovAuthToken()

            if (!token) {
                if (embedded) {
                    setEmbeddedAuthFailed(true)
                    setAuthChecked(true)
                    return
                }
                window.location.href = '/garca-cidadao/login'
                return
            }

            const me = await fetchJsonWithTimeout(`${API}/auth/me`, { Authorization: `Bearer ${token}` })
            if (cancelled) return
            if (!me) {
                localStorage.removeItem('govToken')
                if (embedded) {
                    setEmbeddedAuthFailed(true)
                    setAuthChecked(true)
                    return
                }
                localStorage.setItem(FORCE_LOGIN_KEY, '1')
                window.location.href = '/garca-cidadao/login'
                return
            }

            localStorage.setItem('govToken', token)
            localStorage.removeItem(FORCE_LOGIN_KEY)
            if (embedded) {
                sessionStorage.setItem('govEmbedded', '1')
            }
            setEmbeddedAuthFailed(false)
            setUser(me as UserInfo)
            setAuthChecked(true)
        }
        verifySession()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        if (!formMessage && !formError) return
        const timerId = window.setTimeout(() => {
            setFormMessage('')
            setFormError('')
        }, 4500)
        return () => window.clearTimeout(timerId)
    }, [formMessage, formError])

    useEffect(() => {
        if (typeof window === 'undefined') {
            triageHandledIdsRef.current = new Set()
            triageHandledFingerprintsRef.current = new Set()
            setTriageHandledLoaded(false)
            return
        }
        const storageKey = user?.id || user?.email
            ? `${TRIAGE_HANDLED_STORAGE_PREFIX}${user.id || user.email}`
            : null
        try {
            const parseStored = (raw: string | null): { ids: string[]; fingerprints: string[] } => {
                if (!raw) return { ids: [], fingerprints: [] }
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) {
                    return {
                        ids: parsed.filter((id: unknown): id is string => typeof id === 'string'),
                        fingerprints: [],
                    }
                }
                if (!parsed || typeof parsed !== 'object') {
                    return { ids: [], fingerprints: [] }
                }
                return {
                    ids: Array.isArray(parsed.ids) ? parsed.ids.filter((id: unknown): id is string => typeof id === 'string') : [],
                    fingerprints: Array.isArray(parsed.fingerprints) ? parsed.fingerprints.filter((id: unknown): id is string => typeof id === 'string') : [],
                }
            }

            const globalStored = parseStored(localStorage.getItem(TRIAGE_HANDLED_STORAGE_GLOBAL))
            const userStored = storageKey ? parseStored(localStorage.getItem(storageKey)) : { ids: [], fingerprints: [] }
            triageHandledIdsRef.current = new Set([...globalStored.ids, ...userStored.ids])
            triageHandledFingerprintsRef.current = new Set([...globalStored.fingerprints, ...userStored.fingerprints])
            setTriageHandledLoaded(true)
        } catch (_err) {
            triageHandledIdsRef.current = new Set()
            triageHandledFingerprintsRef.current = new Set()
            setTriageHandledLoaded(true)
        }
    }, [user?.email, user?.id])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const headers = getAuthHeaders()
            const [occRes, heatRes, secRes, catRes, meRes] = await Promise.allSettled([
                fetchJsonWithTimeout(`${API}/occurrences`, headers),
                fetchJsonWithTimeout(`${API}/occurrences/heatmap?per_occurrence=true`, headers),
                fetchJsonWithTimeout(`${API}/catalog/secretariats`, headers),
                fetchJsonWithTimeout(`${API}/catalog/categories`, {}),
                fetchJsonWithTimeout(`${API}/auth/me`, headers),
            ])
            if (occRes.status === 'fulfilled' && Array.isArray(occRes.value)) setOccurrences(occRes.value)
            if (heatRes.status === 'fulfilled' && Array.isArray(heatRes.value)) setHeatmapPoints(heatRes.value)
            if (secRes.status === 'fulfilled' && Array.isArray(secRes.value)) setSecretariats(secRes.value)
            if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) setCategories(catRes.value)
            let meData: UserInfo | null = null
            if (meRes.status === 'fulfilled' && meRes.value) {
                meData = meRes.value as UserInfo
                setUser(meData)
            }
            const effectiveRole = resolveEffectiveRole(meData?.role, meData?.secretariat_id)
            if (meData && isStaffRole(effectiveRole)) {
                const usersRes = await fetchJsonWithTimeout(`${API}/users`, headers)
                if (Array.isArray(usersRes)) setUsersList(usersRes)
            } else {
                setUsersList([])
            }
        } catch (e) {
            console.error('[GovCidadao] load error:', e)
        } finally {
            setLoading(false)
            setMeReady(true)
        }
    }, [])

    useEffect(() => {
        if (!authChecked) return
        loadData()
    }, [authChecked, loadData])

    // ── Helpers ──
    const secretariatName = (id: string | null) =>
        secretariats.find((s) => s.id === id)?.title ?? '—'

    const categoryName = (id: string | null) =>
        categories.find((c) => c.id === id)?.title ?? '—'

    const userSecName = user?.secretariat_id ? secretariatName(user.secretariat_id) : '—'
    const normalizedUserRole = resolveEffectiveRole(user?.role, user?.secretariat_id)
    const isStaffUser = Boolean(meReady && user && isStaffRole(normalizedUserRole))
    const isCommonUser = !isStaffUser
    const loadUnreadNotifications = useCallback(async () => {
        if (!isCommonUser) return
        try {
            const headers = getAuthHeaders()
            const data = await fetchJsonWithTimeout(`${API}/notifications/mine?unread_only=true`, headers)
            setUnreadNotifCount(Array.isArray(data) ? data.length : 0)
        } catch {
            setUnreadNotifCount(0)
        }
    }, [isCommonUser])

    const markNotificationsRead = useCallback(async () => {
        try {
            const headers = getAuthHeaders()
            await fetch(`${API}/notifications/read-all`, { method: 'POST', headers })
            setUnreadNotifCount(0)
        } catch {
            // noop
        }
    }, [])
    const isBaseAdmin = normalizedUserRole === 'admin'
    const isPrefeito = isMayorRole(normalizedUserRole)
    const isSecretary = isSecretaryRole(normalizedUserRole)
    const isAdmin = isBaseAdmin && !isPrefeito
    const canCreateCategory = isAdmin || isSecretary || isPrefeito
    const canCreateSecretariat = isAdmin
    const canCreateUser = isAdmin
    const canManageOccurrenceStatus = isAdmin || isSecretary || isPrefeito
    const canViewGeneralScope = isAdmin || isPrefeito

    useEffect(() => {
        if (!meReady || !user || profileLandingRef.current) return
        profileLandingRef.current = true
        if (isStaffRole(normalizedUserRole)) {
            setActiveTab('dashboard')
        } else {
            setActiveTab('ocorrencia')
        }
    }, [meReady, user, normalizedUserRole])

    useEffect(() => {
        if (!authChecked || typeof window === 'undefined') return
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab')
        const occurrence = params.get('occurrence')
        if (tab === 'minhas') setActiveTab('minhas')
        if (occurrence) setDeepLinkOccurrenceId(occurrence)
    }, [authChecked])

    useEffect(() => {
        if (!authChecked || !isCommonUser) return
        loadUnreadNotifications()
        const timer = window.setInterval(loadUnreadNotifications, 45000)
        return () => window.clearInterval(timer)
    }, [authChecked, isCommonUser, loadUnreadNotifications])

    useEffect(() => {
        if (!isCommonUser) return
        if (activeTab === 'ocorrencia' || activeTab === 'minhas') return
        setActiveTab('ocorrencia')
    }, [isCommonUser, activeTab])

    // ── Filters ──
    const scopeOccs = (!canViewGeneralScope || scope === 'mine') && user?.secretariat_id
        ? occurrences.filter((o) => o.secretariat_id === user.secretariat_id)
        : occurrences

    // ── Derived stats ──
    const active = scopeOccs.filter((o) => o.status === 'open' || o.status === 'in_progress')
    const critical = scopeOccs.filter((o) => o.urgency === 'critical' && o.status !== 'resolved' && o.status !== 'canceled')
    const overdue = scopeOccs.filter((o) => {
        if (!o.due_at || o.status === 'resolved' || o.status === 'canceled') return false
        return new Date(o.due_at) < new Date()
    })
    const resolved = scopeOccs.filter((o) => o.status === 'resolved')
    const resolutionRate = scopeOccs.length ? ((resolved.length / scopeOccs.length) * 100).toFixed(1) : '0.0'
    const socialRiskCategoryIds = new Set(
        categories
            .filter((c) => SOCIAL_RISK_CATEGORY_KEYS.has(normalizeText(c.title)))
            .map((c) => c.id),
    )
    const isSocialRiskOccurrence = (occ: Occurrence) =>
        Boolean(occ.category_id && socialRiskCategoryIds.has(occ.category_id))
    const comparePriority = (a: Occurrence, b: Occurrence) => {
        const riskDiff = Number(isSocialRiskOccurrence(b)) - Number(isSocialRiskOccurrence(a))
        if (riskDiff !== 0) return riskDiff
        return (
            (URGENCY_RANK[b.urgency] ?? 0) - (URGENCY_RANK[a.urgency] ?? 0) ||
            b.priority_score - a.priority_score
        )
    }

    const topPriority = [...scopeOccs]
        .filter((o) => o.status !== 'resolved' && o.status !== 'canceled')
        .sort(comparePriority)
        .slice(0, 5)

    const bySecretariat = secretariats
        .map((s) => {
            const items = scopeOccs.filter((o) => o.secretariat_id === s.id)
            const count = items.length
            const recurrenceCount = items.filter((o) => (o.recurrence_level ?? 0) > 0).length
            const heatScore = count > 0 ? recurrenceCount / count : 0
            return {
                name: s.sigla || s.title.substring(0, 20),
                full: s.title,
                count,
                recurrenceCount,
                heatScore,
                color: getHeatBarColor(heatScore),
            }
        })
        .filter((s) => s.count > 0)
        .sort((a, b) => b.count - a.count)

    const mapOccs = scopeOccs.filter((o) => {
        if (o.status === 'resolved' || o.status === 'canceled') return false
        if (secretariatFilter !== 'todas' && o.secretariat_id !== secretariatFilter) return false
        if (neighborhoodFilter && !o.neighborhood?.toLowerCase().includes(neighborhoodFilter.toLowerCase())) return false
        return true
    })

    const filteredList = scopeOccs.filter((o) => {
        const q = search.toLowerCase()
        if (!q) return true
        return (
            o.title.toLowerCase().includes(q) ||
            (o.description ?? '').toLowerCase().includes(q) ||
            STATUS_LABEL[o.status]?.toLowerCase().includes(q) ||
            (o.reporter_role ?? '').toLowerCase().includes(q)
        )
    })

    const activeList = filteredList
        .filter((o) => o.status !== 'resolved' && o.status !== 'canceled')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const resolvedList = filteredList.filter((o) => o.status === 'resolved')
    const topList = [...scopeOccs]
        .filter((o) => o.status !== 'resolved' && o.status !== 'canceled')
        .sort(comparePriority)
        .slice(0, 10)

    // ── Graph Data ──
    const byStatus = [
        { key: 'in_progress', name: 'Em andamento' },
        { key: 'resolved', name: 'Resolvidas' },
        { key: 'open', name: 'Abertas' },
    ].map((entry) => {
        const items = scopeOccs.filter((o) => o.status === entry.key)
        const count = items.length
        const recurrenceCount = items.filter((o) => (o.recurrence_level ?? 0) > 0).length
        const heatScore = count > 0 ? recurrenceCount / count : 0
        return {
            name: entry.name,
            count,
            recurrenceCount,
            heatScore,
            color: getHeatBarColor(heatScore),
        }
    })

    const byUrgency = [
        { name: 'Crítica', value: scopeOccs.filter((o) => o.urgency === 'critical').length, color: '#ef4444' },
        { name: 'Alta', value: scopeOccs.filter((o) => o.urgency === 'high').length, color: '#f97316' },
        { name: 'Média', value: scopeOccs.filter((o) => o.urgency === 'medium').length, color: '#eab308' },
        { name: 'Baixa', value: scopeOccs.filter((o) => o.urgency === 'low').length, color: '#22c55e' },
    ].filter((u) => u.value > 0)

    // Ocorrências por tema (top 4 categorias)
    const byCategoryMap = new Map<string, { count: number; recurrenceCount: number }>()
    scopeOccs.forEach((o) => {
        if (o.category_id) {
            const current = byCategoryMap.get(o.category_id) || { count: 0, recurrenceCount: 0 }
            current.count += 1
            if ((o.recurrence_level ?? 0) > 0) current.recurrenceCount += 1
            byCategoryMap.set(o.category_id, current)
        }
    })
    const byCategory = Array.from(byCategoryMap.entries())
        .map(([catId, data]) => {
            const cat = categories.find((c) => c.id === catId)
            const heatScore = data.count > 0 ? data.recurrenceCount / data.count : 0
            return {
                name: cat ? cat.title.substring(0, 15) + (cat.title.length > 15 ? '...' : '') : 'Outros',
                count: data.count,
                recurrenceCount: data.recurrenceCount,
                heatScore,
                color: getHeatBarColor(heatScore),
            }
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)

    // Evolução 7 dias
    const evolutionData = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`

        const count = scopeOccs.filter((o) => o.created_at.startsWith(dateStr)).length
        evolutionData.push({ date: label, name: label, count })
    }

    const handleLogout = () => {
        localStorage.removeItem('govToken')

        setUser(null)
        setCategories([])
        profileLandingRef.current = false
        setMeReady(false)
        setActiveTab('ocorrencia')
        setScope('all')
        setFormError('')
        setFormMessage('')

        if (isEmbeddedGarcaApp()) {
            sessionStorage.removeItem('govEmbedded')
            setEmbeddedAuthFailed(true)
            return
        }

        localStorage.setItem(FORCE_LOGIN_KEY, '1')
        window.location.href = '/garca-cidadao/login'
    }

    const openOccurrenceDetails = (occ: Occurrence) => {
        setSelectedListOccurrence(occ)
        setStatusDraft(occ.status)
    }

    useEffect(() => {
        if (!selectedListOccurrence) return
        const refreshed = scopeOccs.find((item) => item.id === selectedListOccurrence.id)
        if (!refreshed) return
        setSelectedListOccurrence(refreshed)
        setStatusDraft(refreshed.status)
    }, [scopeOccs, selectedListOccurrence])

    useEffect(() => {
        if (!triageOccurrence) return
        const refreshed = occurrences.find((item) => item.id === triageOccurrence.id)
        if (!refreshed) {
            setTriageOccurrence(null)
            return
        }
        setTriageOccurrence(refreshed)
        setTriageStatusDraft(refreshed.status)
        setTriageUrgencyDraft(refreshed.urgency)
    }, [occurrences, triageOccurrence])

    useEffect(() => {
        if (!hasSecretaryLikePermissions(resolveEffectiveRole(user?.role, user?.secretariat_id)) || !user?.secretariat_id) return
        if (!triageHandledLoaded) return
        if (selectedListOccurrence || triageOccurrence) return

        const pending = occurrences
            .filter((o) =>
                o.secretariat_id === user.secretariat_id &&
                o.status === 'open' &&
                isCitizenReporterRole(o.reporter_role) &&
                !(o.assigned_team || '').trim() &&
                !triageDeferredIdsRef.current.has(o.id) &&
                !triageHandledIdsRef.current.has(o.id) &&
                !triageHandledFingerprintsRef.current.has(getTriageFingerprint(o)),
            )
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        if (pending.length === 0) return
        const next = pending[0]
        setTriageOccurrence(next)
        setTriageStatusDraft(next.status)
        setTriageUrgencyDraft(next.urgency)
    }, [occurrences, user?.role, user?.secretariat_id, selectedListOccurrence, triageOccurrence, triageHandledLoaded])

    const updateOccurrenceStatus = async () => {
        if (!selectedListOccurrence) return
        if (!((user?.role || '').toLowerCase().trim() === 'admin' || hasSecretaryLikePermissions(resolveEffectiveRole(user?.role, user?.secretariat_id)))) {
            setFormError('Você não tem permissão para alterar o status da ocorrência.')
            return
        }
        setFormError('')
        setFormMessage('')
        setUpdatingOccurrenceStatus(true)
        const headers = getAuthHeaders()
        const result = await patchJsonWithTimeout(`${API}/occurrences/${selectedListOccurrence.id}`, {
            status: statusDraft,
        }, headers)
        setUpdatingOccurrenceStatus(false)
        if (!result.ok) {
            setFormError(result.message)
            return
        }
        setFormMessage('Status da ocorrência atualizado com sucesso.')
        await loadData()
    }

    const deferTriageOccurrence = () => {
        if (!triageOccurrence) return
        triageDeferredIdsRef.current.add(triageOccurrence.id)
        setTriageOccurrence(null)
    }

    const submitTriageOccurrence = async () => {
        if (!triageOccurrence) return
        const triageId = triageOccurrence.id
        const triageFingerprint = getTriageFingerprint(triageOccurrence)
        setFormMessage('')
        setFormError('')
        setTriageSaving(true)
        const headers = getAuthHeaders()
        const result = await patchJsonWithTimeout(`${API}/occurrences/${triageId}`, {
            status: triageStatusDraft === 'open' ? 'in_progress' : triageStatusDraft,
            urgency: triageUrgencyDraft,
            assigned_team: TRIAGED_MARKER_TEAM,
        }, headers)
        setTriageSaving(false)
        if (!result.ok) {
            setFormError(result.message)
            return
        }
        triageHandledIdsRef.current.add(triageId)
        triageHandledFingerprintsRef.current.add(triageFingerprint)
        triageDeferredIdsRef.current.add(triageId)
        persistHandledTriage(triageHandledIdsRef.current, triageHandledFingerprintsRef.current)
        setFormMessage('Triagem da ocorrência salva com sucesso.')
        setTriageOccurrence(null)
        await loadData()
    }

    const normalizedUserSearch = userSearch.trim().toLowerCase()
    const filteredUsers = usersList.filter((u) => {
        if (!normalizedUserSearch) return true
        const secName = secretariatName(u.secretariat_id ?? null).toLowerCase()
        return (
            u.name.toLowerCase().includes(normalizedUserSearch) ||
            u.email.toLowerCase().includes(normalizedUserSearch) ||
            resolveEffectiveRole(u.role, u.secretariat_id).includes(normalizedUserSearch) ||
            secName.includes(normalizedUserSearch)
        )
    })
    const normalizedOccurrenceSearch = occurrenceSearch.trim().toLowerCase()
    const manageOccurrenceList = [...scopeOccs]
        .filter((o) => {
            if (!normalizedOccurrenceSearch) return true
            const secName = secretariatName(o.secretariat_id).toLowerCase()
            return (
                o.title.toLowerCase().includes(normalizedOccurrenceSearch) ||
                (o.description || '').toLowerCase().includes(normalizedOccurrenceSearch) ||
                (o.address || '').toLowerCase().includes(normalizedOccurrenceSearch) ||
                (o.neighborhood || '').toLowerCase().includes(normalizedOccurrenceSearch) ||
                secName.includes(normalizedOccurrenceSearch) ||
                (STATUS_LABEL[o.status] || o.status).toLowerCase().includes(normalizedOccurrenceSearch) ||
                (URGENCY_LABEL[o.urgency] || o.urgency).toLowerCase().includes(normalizedOccurrenceSearch)
            )
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    useEffect(() => {
        if (isSecretary && scope !== 'mine') {
            setScope('mine')
        }
    }, [isSecretary, scope])

    const normalizedSecretariatSearch = secretariatSearch.trim().toLowerCase()
    const filteredSecretariats = secretariats.filter((s) => {
        if (!normalizedSecretariatSearch) return true
        return (
            s.title.toLowerCase().includes(normalizedSecretariatSearch) ||
            (s.sigla || '').toLowerCase().includes(normalizedSecretariatSearch) ||
            (s.email || '').toLowerCase().includes(normalizedSecretariatSearch) ||
            (s.phone || '').toLowerCase().includes(normalizedSecretariatSearch) ||
            (s.address || '').toLowerCase().includes(normalizedSecretariatSearch)
        )
    })

    const submitOccurrence = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormMessage('')
        setFormError('')

        if (!occForm.category_id) {
            setFormError('Selecione a categoria para liberar o preenchimento da ocorrência.')
            return
        }
        const selectedCategory = categories.find((c) => c.id === occForm.category_id)
        if (!selectedCategory?.secretariat_id) {
            setFormError('A categoria selecionada não possui secretaria vinculada.')
            return
        }

        const titleTrim = occForm.title.trim()
        const descTrim = occForm.description.trim()
        if (!titleTrim || !descTrim || !occForm.address.trim()) {
            setFormError('Preencha título, descrição e endereço.')
            return
        }
        if (titleTrim.length < 3) {
            setFormError('O título deve ter pelo menos 3 caracteres.')
            return
        }
        if (descTrim.length < 5) {
            setFormError('A descrição deve ter pelo menos 5 caracteres. Descreva melhor o problema.')
            return
        }

        setSubmittingOccurrence(true)
        const headers = getAuthHeaders()
        const createPayload = {
            source: occForm.source,
            title: titleTrim,
            description: descTrim,
            latitude: 0,
            longitude: 0,
            urgency: isCommonUser ? 'medium' : occForm.urgency,
            secretariat_id: selectedCategory.secretariat_id,
            category_id: occForm.category_id || null,
            reporter_name: user?.name || null,
            reporter_contact: user?.email || null,
            reporter_role: user?.role || null,
            cep: occForm.cep.trim() || null,
            address: occForm.address.trim(),
            number: occForm.number.trim() || null,
            neighborhood: occForm.neighborhood.trim() || null,
            city: occForm.city.trim() || null,
            state: occForm.state.trim() || null,
        }
        const updatePayload = {
            urgency: isCommonUser ? undefined : occForm.urgency,
            secretariat_id: selectedCategory.secretariat_id,
            category_id: occForm.category_id || null,
            cep: occForm.cep.trim() || null,
            address: occForm.address.trim(),
            number: occForm.number.trim() || null,
            neighborhood: occForm.neighborhood.trim() || null,
            city: occForm.city.trim() || null,
            state: occForm.state.trim() || null,
        }

        const result = editingOccurrenceId
            ? await patchJsonWithTimeout(`${API}/occurrences/${editingOccurrenceId}`, updatePayload, headers, 45000)
            : await postJsonWithTimeout(`${API}/occurrences`, createPayload, headers, 45000)
        setSubmittingOccurrence(false)
        if (!result.ok) {
            setFormError(result.message)
            return
        }

        if (!editingOccurrenceId && isCommonUser && result.ok && 'data' in result) {
            const created = result.data as Occurrence
            setSuccessOccurrence({
                id: created.id,
                external_id: created.external_id,
                created_at: created.created_at,
                secretariatName: secretariatName(created.secretariat_id),
            })
            setSuccessModalOpen(true)
            setFormMessage('')
        } else {
            setFormMessage(editingOccurrenceId ? 'Ocorrência atualizada com sucesso.' : 'Ocorrência cadastrada com sucesso.')
        }
        setEditingOccurrenceId(null)
        setOccForm({
            source: 'internal',
            title: '',
            description: '',
            urgency: 'medium',
            secretariat_id: '',
            category_id: '',
            cep: '',
            address: '',
            number: '',
            neighborhood: '',
            city: 'Garça',
            state: 'SP',
        })
        await loadData()
    }

    const startEditOccurrence = (target: Occurrence) => {
        if (!canManageOccurrenceStatus) {
            setFormError('Apenas admin ou secretário podem editar ocorrências.')
            return
        }
        setFormMessage('')
        setFormError('')
        setEditingOccurrenceId(target.id)
        setOccForm({
            source: target.source || 'internal',
            title: target.title || '',
            description: target.description || '',
            urgency: target.urgency || 'medium',
            secretariat_id: target.secretariat_id || '',
            category_id: target.category_id || '',
            cep: target.cep || '',
            address: target.address || '',
            number: target.number || '',
            neighborhood: target.neighborhood || '',
            city: target.city || 'Garça',
            state: target.state || 'SP',
        })
        setActiveTab('ocorrencia')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const cancelOccurrenceEdit = () => {
        setEditingOccurrenceId(null)
        setOccForm({
            source: 'internal',
            title: '',
            description: '',
            urgency: 'medium',
            secretariat_id: '',
            category_id: '',
            cep: '',
            address: '',
            number: '',
            neighborhood: '',
            city: 'Garça',
            state: 'SP',
        })
    }

    const deleteOccurrenceById = async (target: Occurrence) => {
        if (!canManageOccurrenceStatus) {
            setFormError('Apenas admin ou secretário podem excluir ocorrências.')
            return
        }
        if (!window.confirm(`Deseja realmente excluir a ocorrência "${target.title}"?`)) return
        setFormMessage('')
        setFormError('')
        const headers = getAuthHeaders()
        const result = await deleteJsonWithTimeout(`${API}/occurrences/${target.id}`, headers)
        if (!result.ok) {
            setFormError(result.message)
            return
        }
        if (editingOccurrenceId === target.id) cancelOccurrenceEdit()
        if (selectedListOccurrence?.id === target.id) setSelectedListOccurrence(null)
        setFormMessage('Ocorrência excluída com sucesso.')
        await loadData()
    }

    const lookupCep = async () => {
        setFormMessage('')
        setFormError('')
        if (!occForm.category_id) {
            setFormError('Selecione a categoria antes de consultar o CEP.')
            return
        }
        const digits = (occForm.cep || '').replace(/\D/g, '')
        if (digits.length !== 8) {
            setFormError('Informe um CEP válido com 8 dígitos.')
            return
        }

        setLoadingCep(true)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
            const data = await response.json()
            if (data?.erro) {
                setFormError('CEP não encontrado.')
                return
            }

            setOccForm((prev) => ({
                ...prev,
                cep: digits,
                address: data.logradouro || prev.address,
                neighborhood: data.bairro || prev.neighborhood,
                city: data.localidade || prev.city,
                state: data.uf || prev.state,
            }))
            setFormMessage('CEP localizado e endereço preenchido.')
        } catch (_err) {
            setFormError('Não foi possível consultar o CEP agora.')
        } finally {
            setLoadingCep(false)
        }
    }

    const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormMessage('')
        setFormError('')

        if (!canCreateCategory) {
            setFormError('Apenas admin ou secretário podem cadastrar categorias.')
            return
        }

        const formData = new FormData(event.currentTarget)
        const titleFromForm = String(formData.get('title') ?? '').trim()
        const descriptionFromForm = String(formData.get('description') ?? '').trim()
        const secretariatFromForm = String(formData.get('secretariat_id') ?? '').trim()
        const slaFromForm = Number(formData.get('sla_days') ?? 0)
        const normalized = {
            // Prioriza o valor não-vazio entre DOM e estado React para evitar falso negativo.
            title: titleFromForm || String(catForm.title ?? '').trim(),
            description: descriptionFromForm || String(catForm.description ?? '').trim(),
            secretariat_id: secretariatFromForm || String(catForm.secretariat_id ?? '').trim(),
            sla_days: slaFromForm || Number(catForm.sla_days ?? 5) || 5,
        }
        if (editingCategoryId && !normalized.description) {
            // Alguns registros legados vieram sem descrição; evita travar a edição.
            normalized.description = `Categoria ${normalized.title || 'sem título'}`
        }

        const missingFields: string[] = []
        if (!normalized.title) missingFields.push('título')
        if (!normalized.description) missingFields.push('descrição')
        if (!normalized.secretariat_id) missingFields.push('secretaria')

        if (missingFields.length > 0) {
            setFormError(`Preencha os campos obrigatórios: ${missingFields.join(', ')}.`)
            return
        }
        setCatForm(normalized)

        setSubmittingCategory(true)
        const headers = getAuthHeaders()
        const payload = normalized
        const result = editingCategoryId
            ? await putJsonWithTimeout(`${API}/catalog/categories/${editingCategoryId}`, payload, headers)
            : await postJsonWithTimeout(`${API}/catalog/categories`, payload, headers)
        setSubmittingCategory(false)

        if (!result.ok) {
            setFormError(result.message)
            return
        }

        setFormMessage(editingCategoryId ? 'Categoria atualizada com sucesso.' : 'Categoria cadastrada com sucesso.')
        setEditingCategoryId(null)
        setCatForm({ title: '', description: '', secretariat_id: '', sla_days: 5 })
        await loadData()
    }

    const pickSecretariatForRiskCategory = (title: string): string | null => {
        const normalizedTitle = normalizeText(title)
        const preferenceByKeyword: Array<{ keyword: string; targets: string[] }> = [
            { keyword: 'saude', targets: ['saude'] },
            { keyword: 'medic', targets: ['saude'] },
            { keyword: 'creche', targets: ['educacao'] },
            { keyword: 'transporte', targets: ['transporte', 'mobilidade', 'transito'] },
            { keyword: 'seguranca', targets: ['seguranca', 'guarda'] },
            { keyword: 'iluminacao', targets: ['iluminacao', 'eletrica', 'servicos'] },
            { keyword: 'buraco', targets: ['obras', 'infra', 'servicos', 'zeladoria'] },
            { keyword: 'recapeamento', targets: ['obras', 'infra', 'servicos'] },
            { keyword: 'estradas rurais', targets: ['obras', 'infra', 'agric', 'rural'] },
            { keyword: 'lixo', targets: ['limpeza', 'servicos', 'meio ambiente'] },
            { keyword: 'mato alto', targets: ['zeladoria', 'servicos', 'meio ambiente'] },
            { keyword: 'pracas', targets: ['zeladoria', 'servicos', 'meio ambiente'] },
            { keyword: 'enchentes', targets: ['obras', 'infra', 'drenagem'] },
            { keyword: 'iptu', targets: ['fazenda', 'financas', 'tribut'] },
            { keyword: 'nepotismo', targets: ['administracao', 'governo', 'ouvidoria', 'controladoria'] },
            { keyword: 'transparencia', targets: ['administracao', 'governo', 'ouvidoria', 'controladoria'] },
            { keyword: 'promessas', targets: ['governo', 'administracao', 'ouvidoria'] },
            { keyword: 'prefeitura nao responder', targets: ['ouvidoria', 'administracao', 'governo'] },
        ]

        const match = preferenceByKeyword.find((rule) => normalizedTitle.includes(rule.keyword))
        const sec = match
            ? secretariats.find((s) => {
                const secName = normalizeText(`${s.title} ${s.sigla}`)
                return match.targets.some((target) => secName.includes(target))
            })
            : null

        return sec?.id || secretariats[0]?.id || null
    }

    const importSocialRiskCategories = async () => {
        if (!canCreateCategory) {
            setFormError('Apenas admin ou secretário podem importar categorias.')
            return
        }
        if (secretariats.length === 0) {
            setFormError('Cadastre ao menos uma secretaria antes de importar as categorias.')
            return
        }
        setFormMessage('')
        setFormError('')
        setImportingRiskCategories(true)
        const headers = getAuthHeaders()
        const existingKeys = new Set(categories.map((c) => normalizeText(c.title)))
        let created = 0
        let skipped = 0

        for (const title of SOCIAL_RISK_CATEGORY_TITLES) {
            const key = normalizeText(title)
            if (existingKeys.has(key)) {
                skipped += 1
                continue
            }
            const secretariatId = pickSecretariatForRiskCategory(title)
            if (!secretariatId) {
                skipped += 1
                continue
            }
            const result = await postJsonWithTimeout(`${API}/catalog/categories`, {
                title,
                description: 'Categoria sensível para monitoramento de risco de denúncias em redes sociais.',
                secretariat_id: secretariatId,
                sla_days: 5,
            }, headers)
            if (result.ok) {
                created += 1
                existingKeys.add(key)
            } else {
                skipped += 1
            }
        }

        setImportingRiskCategories(false)
        await loadData()
        setFormMessage(`Categorias de risco importadas. Criadas: ${created}. Ignoradas: ${skipped}.`)
    }

    const startEditCategory = (target: Category) => {
        setFormMessage('')
        setFormError('')
        setEditingCategoryId(target.id)
        const fallbackDescription = target.description?.trim() || `Categoria ${target.title || 'sem título'}`
        setCatForm({
            title: target.title || '',
            description: fallbackDescription,
            secretariat_id: target.secretariat_id || '',
            sla_days: Number(target.sla_days) || 5,
        })
    }

    const cancelCategoryEdit = () => {
        setEditingCategoryId(null)
        setCatForm({ title: '', description: '', secretariat_id: '', sla_days: 5 })
    }

    const deleteCategoryById = async (target: Category) => {
        if (!canCreateCategory) {
            setFormError('Apenas admin ou secretário podem excluir categorias.')
            return
        }
        if (!window.confirm(`Deseja realmente excluir a categoria "${target.title}"?`)) return
        setFormMessage('')
        setFormError('')
        const headers = getAuthHeaders()
        const result = await deleteJsonWithTimeout(`${API}/catalog/categories/${target.id}`, headers)
        if (!result.ok) {
            setFormError(result.message)
            return
        }
        if (editingCategoryId === target.id) cancelCategoryEdit()
        setFormMessage('Categoria excluída com sucesso.')
        await loadData()
    }

    const submitSecretariat = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormMessage('')
        setFormError('')

        if (!canCreateSecretariat) {
            setFormError('Apenas admin pode cadastrar secretarias.')
            return
        }

        // Fallback via FormData evita falso negativo quando o navegador preenche campos (autofill)
        // sem disparar onChange em todos os inputs controlados.
        const formData = new FormData(event.currentTarget)
        const normalized = {
            title: String(formData.get('title') ?? secForm.title ?? '').trim(),
            sigla: String(formData.get('sigla') ?? secForm.sigla ?? '').trim().toUpperCase(),
            phone: String(formData.get('phone') ?? secForm.phone ?? '').trim(),
            email: String(formData.get('email') ?? secForm.email ?? '').trim().toLowerCase(),
            address: String(formData.get('address') ?? secForm.address ?? '').trim(),
        }

        const missingFields: string[] = []
        if (!normalized.title) missingFields.push('título')
        if (!normalized.sigla) missingFields.push('sigla')
        if (!normalized.phone) missingFields.push('telefone')
        if (!normalized.email) missingFields.push('e-mail')
        if (!normalized.address) missingFields.push('endereço')

        if (missingFields.length > 0) {
            setFormError(`Preencha os campos obrigatórios: ${missingFields.join(', ')}.`)
            return
        }

        setSubmittingSecretariat(true)
        const headers = getAuthHeaders()
        const result = editingSecretariatId
            ? await putJsonWithTimeout(`${API}/catalog/secretariats/${editingSecretariatId}`, normalized, headers)
            : await postJsonWithTimeout(`${API}/catalog/secretariats`, normalized, headers)
        setSubmittingSecretariat(false)

        if (!result.ok) {
            setFormError(result.message)
            return
        }

        setFormMessage(editingSecretariatId ? 'Secretaria atualizada com sucesso.' : 'Secretaria cadastrada com sucesso.')
        setEditingSecretariatId(null)
        setSecForm({
            title: '',
            sigla: '',
            phone: '',
            email: '',
            address: '',
        })
        await loadData()
    }

    const startEditSecretariat = (target: Secretariat) => {
        if (!canCreateSecretariat) {
            setFormError('Apenas admin pode editar secretarias.')
            return
        }
        setFormMessage('')
        setFormError('')
        setEditingSecretariatId(target.id)
        setSecForm({
            title: target.title || '',
            sigla: target.sigla || '',
            phone: target.phone || '',
            email: target.email || '',
            address: target.address || '',
        })
    }

    const cancelSecretariatEdit = () => {
        setEditingSecretariatId(null)
        setSecForm({
            title: '',
            sigla: '',
            phone: '',
            email: '',
            address: '',
        })
    }

    const deleteSecretariatById = async (target: Secretariat) => {
        if (!canCreateSecretariat) {
            setFormError('Apenas admin pode excluir secretarias.')
            return
        }
        if (!window.confirm(`Deseja realmente excluir a secretaria "${target.title}"?`)) return
        setFormMessage('')
        setFormError('')
        const headers = getAuthHeaders()
        const result = await deleteJsonWithTimeout(`${API}/catalog/secretariats/${target.id}`, headers)
        if (!result.ok) {
            setFormError(result.message)
            return
        }
        if (editingSecretariatId === target.id) cancelSecretariatEdit()
        setFormMessage('Secretaria excluída com sucesso.')
        await loadData()
    }

    const submitUser = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormMessage('')
        setFormError('')

        if (!canCreateUser) {
            setFormError('Apenas admin pode cadastrar usuários.')
            return
        }
        if (!userForm.name.trim() || !userForm.email.trim() || !userForm.role) {
            setFormError(editingUserId ? 'Preencha nome, e-mail e perfil.' : 'Preencha nome, e-mail, perfil e senha.')
            return
        }
        if (!editingUserId && !userForm.password.trim()) {
            setFormError('Preencha nome, e-mail, perfil e senha.')
            return
        }
        if ((userForm.role === 'secretary' || userForm.role === 'prefeito') && !userForm.secretariat_id) {
            setFormError('Selecione uma secretaria para usuário secretário ou prefeito.')
            return
        }

        setSubmittingUser(true)
        const headers = getAuthHeaders()
        const payload: Record<string, unknown> = {
            name: userForm.name.trim(),
            email: userForm.email.trim().toLowerCase(),
            image: userForm.image.trim() || null,
            role: userForm.role,
            secretariat_id: userForm.role === 'secretary' || userForm.role === 'prefeito' ? userForm.secretariat_id : null,
        }
        if (userForm.password.trim()) payload.password = userForm.password

        const result = editingUserId
            ? await patchJsonWithTimeout(`${API}/users/${editingUserId}`, payload, headers)
            : await postJsonWithTimeout(`${API}/users`, payload, headers)
        setSubmittingUser(false)

        if (!result.ok) {
            setFormError(result.message)
            return
        }

        setFormMessage(editingUserId ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado com sucesso.')
        setEditingUserId(null)
        setUserForm({
            name: '',
            email: '',
            image: '',
            password: '',
            role: '',
            secretariat_id: '',
        })
        await loadData()
    }

    const startEditUser = (target: UserInfo) => {
        setFormMessage('')
        setFormError('')
        setEditingUserId(target.id)
        setUserForm({
            name: target.name || '',
            email: target.email || '',
            image: target.image || '',
            password: '',
            role: resolveEffectiveRole(target.role, target.secretariat_id),
            secretariat_id: target.secretariat_id || '',
        })
    }

    const cancelUserEdit = () => {
        setEditingUserId(null)
        setUserForm({
            name: '',
            email: '',
            image: '',
            password: '',
            role: '',
            secretariat_id: '',
        })
    }

    const deleteUserById = async (target: UserInfo) => {
        if (!canCreateUser) {
            setFormError('Apenas admin pode excluir usuários.')
            return
        }
        if (!window.confirm(`Deseja realmente excluir o usuário ${target.name}?`)) return
        setFormMessage('')
        setFormError('')
        const headers = getAuthHeaders()
        const result = await deleteJsonWithTimeout(`${API}/users/${target.id}`, headers)
        if (!result.ok) {
            setFormError(result.message)
            return
        }
        setFormMessage('Usuário excluído com sucesso.')
        if (editingUserId === target.id) {
            cancelUserEdit()
        }
        await loadData()
    }

    const checkNewOccurrences = async () => {
        if (checkingNewOccurrences) return
        setFormMessage('')
        setFormError('')
        setCheckingNewOccurrences(true)
        try {
            const headers = getAuthHeaders()
            const knownIds = new Set(occurrences.map((o) => o.id))
            const [occRes, heatRes] = await Promise.all([
                fetchJsonWithTimeout(`${API}/occurrences`, headers),
                fetchJsonWithTimeout(`${API}/occurrences/heatmap?per_occurrence=true`, headers),
            ])

            if (!Array.isArray(occRes)) {
                setFormError('Não foi possível verificar novas ocorrências no momento.')
                return
            }

            setOccurrences(occRes)
            if (Array.isArray(heatRes)) setHeatmapPoints(heatRes)

            const newOccurrences = occRes.filter((o) => !knownIds.has(o.id))
            let relevantNewCount = newOccurrences.length
            if (hasSecretaryLikePermissions(resolveEffectiveRole(user?.role, user?.secretariat_id)) && user?.secretariat_id) {
                relevantNewCount = newOccurrences.filter((o) =>
                    o.secretariat_id === user.secretariat_id && isCitizenReporterRole(o.reporter_role),
                ).length
            }

            if (relevantNewCount > 0) {
                setFormMessage(`${relevantNewCount} nova(s) ocorrência(s) encontrada(s).`)
            } else {
                setFormMessage('Nenhuma nova ocorrência no momento.')
            }
        } catch (_err) {
            setFormError('Não foi possível verificar novas ocorrências no momento.')
        } finally {
            setCheckingNewOccurrences(false)
        }
    }

    const kpiListTitle = kpiListFilter === 'all'
        ? 'Ocorrências totais'
        : kpiListFilter === 'critical'
            ? 'Ocorrências críticas'
            : kpiListFilter === 'overdue'
                ? 'Ocorrências atrasadas'
                : kpiListFilter === 'resolved'
                    ? 'Ocorrências resolvidas'
                    : ''

    const kpiListItems = kpiListFilter === 'all'
        ? [...scopeOccs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : kpiListFilter === 'critical'
            ? [...scopeOccs]
                .filter((o) => o.urgency === 'critical' && o.status !== 'resolved' && o.status !== 'canceled')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            : kpiListFilter === 'overdue'
                ? [...scopeOccs]
                    .filter((o) => {
                        if (!o.due_at || o.status === 'resolved' || o.status === 'canceled') return false
                        return new Date(o.due_at) < new Date()
                    })
                    .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime())
                : kpiListFilter === 'resolved'
                    ? [...scopeOccs]
                        .filter((o) => o.status === 'resolved')
                        .sort((a, b) => new Date(b.resolved_at || b.created_at).getTime() - new Date(a.resolved_at || a.created_at).getTime())
                    : []

    // ─── Render ─────────────────────────────────────────────────────────────────
    if (!authChecked) {
        return (
            <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#eef2f7', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                Validando sessão...
            </div>
        )
    }

    if (embeddedAuthFailed) {
        return (
            <div style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                background: '#eef2f7',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
            }}>
                <div style={{
                    maxWidth: '420px',
                    background: 'white',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    border: '1px solid #dde4f0',
                    boxShadow: '0 10px 24px rgba(35, 52, 99, 0.12)',
                    textAlign: 'center',
                }}>
                    <p style={{ margin: '0 0 0.75rem', fontWeight: 700, color: '#1e3a8a', fontSize: '1.05rem' }}>
                        Sessão indisponível
                    </p>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Não foi possível usar sua conta do Prefeitura App neste momento.
                        Feche esta tela e abra o <strong>Boca no Trombone</strong> novamente pelo menu do aplicativo.
                        Se o problema continuar, saia e entre de novo no Prefeitura App.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="garca-cidadao-root" style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#eef2f7', minHeight: '100vh' }}>
            <style>{`
                .garca-cidadao-root input,
                .garca-cidadao-root textarea,
                .garca-cidadao-root select {
                    color: #0f172a !important;
                    background: #f8fbff !important;
                    -webkit-text-fill-color: #0f172a !important;
                    caret-color: #0f172a !important;
                }
                .garca-cidadao-root input::placeholder,
                .garca-cidadao-root textarea::placeholder {
                    color: #64748b !important;
                    opacity: 1 !important;
                }

                .garca-ocorrencia-wrap { padding: clamp(1rem, 3vw, 2.5rem) 1rem; display: flex; justify-content: center; }
                .garca-ocorrencia-card {
                    width: 100%;
                    max-width: 920px;
                    background: #ffffff;
                    border: 1px solid rgba(63, 81, 181, 0.12);
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow:
                        0 1px 2px rgba(15, 23, 42, 0.04),
                        0 24px 48px -20px rgba(37, 99, 235, 0.22);
                }
                .garca-ocorrencia-card-inner { padding: 1.25rem 1.25rem 1.35rem; }
                @media (min-width: 640px) {
                    .garca-ocorrencia-card-inner { padding: 1.5rem 1.75rem 1.65rem; }
                }

                .garca-ocorrencia-hero--citizen {
                    padding: 1.5rem 1.25rem 1.35rem;
                    background:
                        radial-gradient(120% 100% at 0% 0%, rgba(79, 103, 216, 0.18) 0%, transparent 58%),
                        radial-gradient(90% 70% at 100% 0%, rgba(236, 72, 153, 0.1) 0%, transparent 52%),
                        linear-gradient(145deg, #eef2ff 0%, #f8fafc 48%, #ffffff 100%);
                    border-bottom: 1px solid rgba(226, 232, 240, 0.95);
                }
                @media (min-width: 640px) {
                    .garca-ocorrencia-hero--citizen { padding: 1.85rem 1.75rem 1.65rem; }
                }
                .garca-boca-hero-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.25rem;
                    align-items: center;
                }
                @media (min-width: 640px) {
                    .garca-boca-hero-grid { grid-template-columns: 1fr auto; gap: 1.5rem; }
                }
                .garca-boca-hero-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 88px;
                    height: 88px;
                    margin: 0 auto;
                    border-radius: 22px;
                    background: linear-gradient(145deg, #4f67d8 0%, #6366f1 55%, #7c3aed 100%);
                    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.35);
                    color: #fff;
                }
                @media (min-width: 640px) {
                    .garca-boca-hero-icon { width: 96px; height: 96px; margin: 0; }
                }
                .garca-boca-hero-icon svg { width: 46px; height: 46px; }
                .garca-boca-badge {
                    display: inline-block;
                    font-size: 0.66rem;
                    font-weight: 800;
                    letter-spacing: 0.16em;
                    color: #3730a3;
                    background: rgba(255, 255, 255, 0.85);
                    padding: 0.4rem 0.85rem;
                    border-radius: 999px;
                    margin: 0 0 0.75rem;
                    border: 1px solid rgba(99, 102, 241, 0.25);
                }
                .garca-boca-title {
                    font-size: clamp(1.85rem, 5vw, 2.45rem);
                    font-weight: 800;
                    line-height: 1.08;
                    margin: 0 0 0.45rem;
                    letter-spacing: -0.03em;
                    color: #1e3a8a;
                }
                .garca-boca-sub {
                    font-size: 1.08rem;
                    font-weight: 600;
                    color: #334155;
                    margin: 0 0 0.5rem;
                }
                .garca-boca-hint {
                    font-size: 0.9rem;
                    color: #64748b;
                    line-height: 1.6;
                    margin: 0;
                    max-width: 36rem;
                }

                .garca-boca-steps {
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 6px;
                    margin-bottom: 0.25rem;
                }
                @media (max-width: 520px) {
                    .garca-boca-steps { grid-template-columns: repeat(2, 1fr); gap: 8px; }
                }
                .garca-boca-step-pill {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 8px 6px;
                    border-radius: 12px;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    font-size: 0.68rem;
                    font-weight: 700;
                    color: #64748b;
                    text-align: center;
                    line-height: 1.25;
                }
                .garca-boca-step-pill span:first-child {
                    width: 22px;
                    height: 22px;
                    border-radius: 999px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.72rem;
                    background: #cbd5e1;
                    color: #fff;
                }
                .garca-boca-step-pill.is-active {
                    background: #eef2ff;
                    border-color: #a5b4fc;
                    color: #3730a3;
                }
                .garca-boca-step-pill.is-active span:first-child {
                    background: linear-gradient(135deg, #4f46e5, #2563eb);
                }
                .garca-boca-step-pill.is-done {
                    background: #ecfdf5;
                    border-color: #86efac;
                    color: #166534;
                }
                .garca-boca-step-pill.is-done span:first-child {
                    background: #22c55e;
                }

                .garca-boca-step {
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 12px;
                    padding: 1.1rem 1rem;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    background: #fafbff;
                }
                @media (min-width: 640px) {
                    .garca-boca-step { padding: 1.25rem 1.15rem; gap: 14px; }
                }
                .garca-boca-step--locked {
                    opacity: 0.72;
                }
                .garca-boca-step--unlocked {
                    opacity: 1;
                    border-color: rgba(99, 102, 241, 0.22);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
                }
                .garca-boca-step-title {
                    margin: 0;
                    font-size: 0.95rem;
                    font-weight: 800;
                    color: #1e3a8a;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    letter-spacing: -0.01em;
                }
                .garca-boca-step-title span {
                    width: 28px;
                    height: 28px;
                    border-radius: 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.82rem;
                    background: linear-gradient(135deg, #4f46e5, #2563eb);
                    color: #fff;
                    flex-shrink: 0;
                }
                .garca-boca-step-lead {
                    margin: -4px 0 0;
                    font-size: 0.8125rem;
                    color: #64748b;
                    line-height: 1.45;
                }

                .garca-field-label {
                    display: block;
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 6px;
                }
                .garca-field-label small {
                    font-weight: 500;
                    color: #94a3b8;
                }

                .garca-ocorrencia-header-block { margin-bottom: 1.1rem; }
                .garca-ocorrencia-heading {
                    margin: 0 0 0.35rem;
                    color: #1e3a8a;
                    font-size: 1.2rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                }
                .garca-ocorrencia-lead {
                    margin: 0;
                    font-size: 0.85rem;
                    color: #64748b;
                    line-height: 1.45;
                    max-width: 42rem;
                }

                .garca-ocorrencia-form {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                }

                .garca-address-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
                @media (min-width: 640px) {
                    .garca-address-grid {
                        grid-template-columns: 1fr 120px;
                        gap: 14px;
                    }
                    .garca-address-grid .garca-field-span-2 { grid-column: 1 / -1; }
                }

                .garca-ocorrencia-card .garca-field {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 12px 14px !important;
                    border: 1.5px solid #e2e8f0 !important;
                    border-radius: 12px !important;
                    font-size: 0.9375rem !important;
                    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s !important;
                    background: #fafbff !important;
                }
                .garca-ocorrencia-card .garca-field:hover:not(:disabled) {
                    border-color: #c7d2fe !important;
                }
                .garca-ocorrencia-card .garca-field:focus {
                    outline: none !important;
                    border-color: #6366f1 !important;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.22) !important;
                }
                .garca-ocorrencia-card .garca-field:disabled {
                    opacity: 0.52 !important;
                    cursor: not-allowed !important;
                }
                .garca-ocorrencia-card .garca-field--textarea {
                    min-height: 104px;
                    resize: vertical;
                    line-height: 1.45;
                }
                .garca-ocorrencia-card .garca-field--highlight {
                    border-color: #a5b4fc !important;
                    background: linear-gradient(180deg, #ffffff 0%, #eef2ff 100%) !important;
                    font-weight: 600;
                }
                .garca-ocorrencia-card .garca-field--highlight:focus {
                    border-color: #4f46e5 !important;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.25) !important;
                }
                .garca-ocorrencia-card select.garca-field {
                    cursor: pointer;
                    appearance: auto;
                }

                .garca-secretariat-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    flex-wrap: wrap;
                    padding: 12px 14px;
                    border-radius: 14px;
                    border: 1.5px solid #e0e7ff;
                    background: linear-gradient(180deg, #ffffff 0%, #f5f7ff 100%);
                }
                .garca-secretariat-row span:first-child {
                    background: linear-gradient(135deg, #4f46e5, #2563eb);
                    color: #fff;
                    padding: 5px 12px;
                    border-radius: 999px;
                    font-weight: 800;
                    font-size: 0.72rem;
                    letter-spacing: 0.04em;
                    border: none;
                    flex-shrink: 0;
                }
                .garca-secretariat-row span:last-child {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #334155;
                    line-height: 1.45;
                    flex: 1;
                    min-width: 0;
                }
                .garca-secretariat-row.is-set {
                    border-color: #86efac;
                    background: linear-gradient(180deg, #f0fdf4 0%, #ecfdf5 100%);
                }
                .garca-secretariat-row.is-set span:last-child {
                    color: #166534;
                }

                .garca-ocorrencia-alert {
                    grid-column: 1 / -1;
                    font-size: 0.8rem;
                    color: #92400e;
                    background: linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%);
                    border: 1px solid rgba(251, 191, 36, 0.45);
                    border-radius: 12px;
                    padding: 10px 12px;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
                }

                .garca-ocorrencia-readonly {
                    grid-column: 1 / -1;
                    padding: 11px 14px;
                    border: 1.5px dashed #c7d2fe;
                    border-radius: 12px;
                    background: rgba(248, 250, 252, 0.92);
                    color: #475569;
                    font-size: 0.8125rem;
                    display: flex;
                    align-items: center;
                    min-height: 44px;
                }

                .garca-ocorrencia-cep-row {
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: 1fr auto;
                    gap: 10px;
                    align-items: stretch;
                }
                @media (max-width: 480px) {
                    .garca-ocorrencia-cep-row { grid-template-columns: 1fr; }
                }

                .garca-btn {
                    font-family: inherit;
                    font-size: 0.9rem;
                    font-weight: 700;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s, background 0.15s;
                }
                .garca-btn:disabled { cursor: not-allowed; opacity: 0.5; }
                .garca-btn--primary {
                    padding: 14px 24px;
                    min-height: 48px;
                    border: none;
                    color: #fff;
                    background: linear-gradient(135deg, #4f46e5 0%, #3f51b5 50%, #2563eb 100%);
                    box-shadow: 0 8px 24px rgba(63, 81, 181, 0.38);
                    width: 100%;
                }
                @media (min-width: 480px) {
                    .garca-btn--primary { width: auto; min-width: 200px; }
                }
                .garca-btn--primary:not(:disabled):hover {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 26px rgba(37, 99, 235, 0.38);
                }
                .garca-btn--secondary {
                    padding: 12px 16px;
                    border: 1.5px solid #a5b4fc;
                    color: #3730a3;
                    background: linear-gradient(180deg, #eef2ff 0%, #e0e7ff 100%);
                }
                .garca-btn--secondary:not(:disabled):hover {
                    border-color: #818cf8;
                    background: linear-gradient(180deg, #e0e7ff 0%, #dbeafe 100%);
                }
                .garca-btn--ghost {
                    padding: 12px 16px;
                    border: 1.5px solid #cbd5e1;
                    color: #334155;
                    background: #f8fafc;
                }
                .garca-btn--ghost:not(:disabled):hover {
                    border-color: #94a3b8;
                    background: #f1f5f9;
                }

                .garca-app-header-nav--citizen { justify-content: center; flex: 1; }
                .garca-nav-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 18px;
                    height: 18px;
                    margin-left: 6px;
                    padding: 0 5px;
                    border-radius: 999px;
                    background: #ef4444;
                    color: #fff;
                    font-size: 0.65rem;
                    font-weight: 800;
                }
                .garca-success-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 1200;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.25rem;
                    background: rgba(15, 23, 42, 0.55);
                    backdrop-filter: blur(4px);
                }
                .garca-success-card {
                    width: 100%;
                    max-width: 520px;
                    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                    border-radius: 16px;
                    padding: 2rem 1.75rem;
                    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
                    border: 1px solid #dbeafe;
                    text-align: center;
                }
                .garca-success-icon { font-size: 3rem; line-height: 1; margin-bottom: 0.5rem; }
                .garca-success-title { margin: 0 0 0.75rem; font-size: 1.35rem; color: #0f172a; }
                .garca-success-lead { margin: 0 0 0.65rem; color: #334155; line-height: 1.55; font-size: 0.95rem; }
                .garca-success-lead--muted { color: #64748b; font-size: 0.88rem; }
                .garca-success-meta {
                    display: grid;
                    gap: 10px;
                    margin: 1.25rem 0 1.5rem;
                    text-align: left;
                    background: #eff6ff;
                    border-radius: 12px;
                    padding: 1rem 1.1rem;
                }
                .garca-success-meta dt { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
                .garca-success-meta dd { margin: 2px 0 0; font-weight: 700; color: #1e3a8a; }
                .garca-success-actions { display: flex; flex-direction: column; gap: 10px; }
                .garca-success-btn {
                    padding: 12px 18px;
                    border-radius: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    border: none;
                    font-size: 0.95rem;
                }
                .garca-success-btn--primary { background: linear-gradient(135deg, #1565c0, #0d47a1); color: #fff; }
                .garca-success-btn--ghost { background: #fff; color: #475569; border: 1px solid #cbd5e1; }
                .garca-minhas-wrap { padding: clamp(1rem, 3vw, 2rem) 1rem 2.5rem; max-width: 1100px; margin: 0 auto; }
                .garca-minhas-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
                .garca-minhas-title { margin: 0; font-size: 1.5rem; color: #0f172a; }
                .garca-minhas-sub { margin: 0.35rem 0 0; color: #64748b; max-width: 36rem; }
                .garca-minhas-badge {
                    background: #fef3c7;
                    color: #92400e;
                    border: 1px solid #fcd34d;
                    padding: 8px 12px;
                    border-radius: 10px;
                    font-size: 0.82rem;
                    font-weight: 700;
                }
                .garca-minhas-toolbar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 1rem; align-items: center; }
                .garca-minhas-filters { display: flex; flex-wrap: wrap; gap: 8px; }
                .garca-minhas-filter {
                    padding: 8px 14px;
                    border-radius: 999px;
                    border: 1px solid #cbd5e1;
                    background: #fff;
                    color: #475569;
                    cursor: pointer;
                    font-size: 0.82rem;
                    font-weight: 600;
                }
                .garca-minhas-filter.is-active { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
                .garca-minhas-search { display: flex; gap: 8px; flex: 1; min-width: 220px; }
                .garca-minhas-search input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                }
                .garca-minhas-search button {
                    padding: 8px 14px;
                    border-radius: 8px;
                    border: none;
                    background: #334155;
                    color: #fff;
                    font-weight: 700;
                    cursor: pointer;
                }
                .garca-minhas-grid { display: grid; gap: 1rem; }
                @media (min-width: 900px) {
                    .garca-minhas-grid { grid-template-columns: 1fr 1.1fr; }
                }
                .garca-minhas-list { display: grid; gap: 10px; max-height: 70vh; overflow-y: auto; }
                .garca-minhas-card {
                    text-align: left;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 12px 14px;
                    background: #fff;
                    cursor: pointer;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }
                .garca-minhas-card.is-selected { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
                .garca-minhas-card h3 { margin: 6px 0 4px; font-size: 0.95rem; color: #0f172a; }
                .garca-minhas-card-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
                .garca-minhas-protocol { font-weight: 800; color: #1d4ed8; font-size: 0.8rem; }
                .garca-minhas-status { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
                .garca-minhas-status--open { background: #dbeafe; color: #1e40af; }
                .garca-minhas-status--in_progress { background: #ede9fe; color: #5b21b6; }
                .garca-minhas-status--resolved { background: #dcfce7; color: #166534; }
                .garca-minhas-status--canceled { background: #f1f5f9; color: #64748b; }
                .garca-minhas-meta { margin: 0 0 6px; font-size: 0.78rem; color: #64748b; }
                .garca-minhas-card h3 { margin: 6px 0 4px; }
                .garca-minhas-card-msg {
                    white-space: pre-line;
                    margin: 10px 0 8px;
                    padding: 12px 14px;
                    border-radius: 10px;
                    font-size: 0.84rem;
                    line-height: 1.55;
                    text-align: left;
                    color: #1e3a5f;
                }
                .garca-minhas-card-msg--open {
                    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                    border: 1px solid #93c5fd;
                }
                .garca-minhas-card-msg--in_progress {
                    background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
                    border: 1px solid #c4b5fd;
                }
                .garca-minhas-card-msg--resolved {
                    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                    border: 1px solid #6ee7b7;
                }
                .garca-minhas-card-msg--canceled {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    color: #475569;
                }
                .garca-minhas-detail-headline {
                    margin: 0 0 8px;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: #1d4ed8;
                }
                .garca-minhas-detail {
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 1.1rem 1.2rem;
                    background: #fff;
                }
                .garca-minhas-detail h3 { margin: 0 0 0.75rem; color: #0f172a; }
                .garca-minhas-citizen-msg {
                    white-space: pre-line;
                    background: #f0f9ff;
                    border-left: 4px solid #2563eb;
                    padding: 12px 14px;
                    border-radius: 8px;
                    color: #1e3a5f;
                    font-size: 0.88rem;
                    line-height: 1.5;
                    margin-bottom: 1rem;
                }
                .garca-minhas-detail-meta { display: grid; gap: 8px; margin-bottom: 1rem; }
                .garca-minhas-detail-meta dt { font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; }
                .garca-minhas-detail-meta dd { margin: 0; font-weight: 600; color: #334155; }
                .garca-minhas-timeline-title { margin: 0 0 0.65rem; font-size: 0.9rem; color: #1e3a8a; }
                .garca-minhas-timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
                .garca-minhas-timeline li { border-left: 2px solid #cbd5e1; padding-left: 12px; }
                .garca-minhas-timeline time { display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 2px; }
                .garca-minhas-empty { color: #94a3b8; font-size: 0.88rem; }

                .garca-privacy-panel {
                    padding: 1.5rem 1.25rem 2.5rem;
                    max-width: 720px;
                    margin: 0 auto;
                }
                .garca-privacy-card {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 1.35rem 1.5rem;
                    box-shadow: 0 8px 24px rgba(30, 58, 95, 0.06);
                }
                .garca-privacy-title { margin: 0 0 0.5rem; color: #1e3a5f; font-size: 1.25rem; }
                .garca-privacy-lead { margin: 0 0 0.75rem; color: #475569; font-size: 0.92rem; line-height: 1.5; }
                .garca-privacy-meta { margin: 0 0 1.25rem; font-size: 0.85rem; color: #64748b; }
                .garca-privacy-section {
                    margin-bottom: 1.5rem;
                    padding-bottom: 1.25rem;
                    border-bottom: 1px solid #e2e8f0;
                }
                .garca-privacy-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
                .garca-privacy-section h3 { margin: 0 0 0.5rem; font-size: 1rem; color: #0f172a; }
                .garca-privacy-section p { margin: 0 0 0.85rem; font-size: 0.88rem; color: #64748b; line-height: 1.45; }
                .garca-privacy-section--danger h3 { color: #b91c1c; }
                .garca-privacy-form { display: grid; gap: 12px; }
                .garca-privacy-form label {
                    display: grid;
                    gap: 6px;
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: #334155;
                }
                .garca-privacy-form input {
                    padding: 8px 10px;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    font-size: 0.9rem;
                }
                .garca-privacy-btn {
                    padding: 10px 16px;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 0.88rem;
                    cursor: pointer;
                    border: 1px solid transparent;
                    width: fit-content;
                }
                .garca-privacy-btn--primary {
                    background: #3f51b5;
                    color: #fff;
                    border-color: #3f51b5;
                }
                .garca-privacy-btn--danger {
                    background: #fef2f2;
                    color: #b91c1c;
                    border-color: #fecaca;
                }
                .garca-privacy-btn:disabled { opacity: 0.65; cursor: not-allowed; }
                .garca-privacy-msg { margin: 0.65rem 0 0; font-size: 0.85rem; color: #15803d; }
                .garca-privacy-error { margin: 0.65rem 0 0; font-size: 0.85rem; color: #b91c1c; }

                .garca-ocorrencia-footer {
                    grid-column: 1 / -1;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 14px;
                    padding-top: 4px;
                }
                @media (min-width: 640px) {
                    .garca-ocorrencia-footer {
                        flex-direction: row;
                        justify-content: space-between;
                        align-items: center;
                    }
                }
                .garca-ocorrencia-footer-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    width: 100%;
                }
                @media (min-width: 480px) {
                    .garca-ocorrencia-footer-actions { width: auto; }
                }
                .garca-ocorrencia-footer-note {
                    font-size: 0.78rem;
                    color: #64748b;
                    max-width: 22rem;
                    line-height: 1.4;
                }
                .garca-ocorrencia-card-inner--after-hero {
                    padding-top: 1.2rem;
                }
                .garca-ocorrencia-staff-section {
                    margin-top: 14px;
                    border-top: 1px solid rgba(226, 232, 240, 0.95);
                    padding-top: 12px;
                    display: grid;
                    gap: 10px;
                }

                /* ── Navbar institucional ── */
                .garca-app-header {
                    background: linear-gradient(135deg, #3f51b5 0%, #4f67d8 100%);
                    box-shadow: 0 4px 24px rgba(35, 52, 99, 0.16);
                    clip-path: polygon(0 0, 100% 0, 100% 92%, 0 100%);
                }
                .garca-app-header-inner {
                    max-width: 1280px;
                    margin: 0 auto;
                    padding: 10px clamp(14px, 3vw, 28px) 16px;
                    display: flex;
                    align-items: center;
                    gap: clamp(12px, 2vw, 20px);
                    min-height: 60px;
                }
                .garca-app-header-brand {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                }
                .garca-app-header-brand img {
                    width: clamp(132px, 16vw, 176px);
                    height: auto;
                    object-fit: contain;
                    display: block;
                }
                .garca-app-header-spacer {
                    flex: 1;
                    min-width: 12px;
                }
                .garca-app-header-nav {
                    display: flex;
                    gap: 4px;
                    background: rgba(255, 255, 255, 0.14);
                    border-radius: 10px;
                    padding: 4px;
                    overflow-x: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    max-width: min(100%, 640px);
                }
                .garca-app-header-nav::-webkit-scrollbar { display: none; }
                .garca-app-header-nav-btn {
                    padding: 8px 12px;
                    border: none;
                    cursor: pointer;
                    font-size: 0.8125rem;
                    font-family: inherit;
                    font-weight: 500;
                    background: transparent;
                    color: rgba(255, 255, 255, 0.92);
                    border-radius: 7px;
                    transition: background 0.15s, color 0.15s;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .garca-app-header-nav-btn.is-active {
                    font-weight: 700;
                    background: rgba(15, 23, 42, 0.28);
                    color: #fff;
                }
                .garca-app-header-nav-btn:not(.is-active):hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .garca-app-header-user {
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }
                .garca-app-header-status {
                    background: rgba(255, 255, 255, 0.16);
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    color: #e6f4ff;
                    border-radius: 999px;
                    padding: 5px 10px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    white-space: nowrap;
                    display: none;
                }
                @media (min-width: 900px) {
                    .garca-app-header-status { display: inline-flex; align-items: center; gap: 5px; }
                }
                .garca-app-header-status-dot {
                    color: #4ade80;
                    font-size: 0.55rem;
                    line-height: 1;
                }
                .garca-app-header-user-meta {
                    text-align: right;
                    min-width: 0;
                    max-width: 200px;
                }
                .garca-app-header-user-name {
                    color: #fff;
                    font-weight: 600;
                    font-size: 0.875rem;
                    line-height: 1.25;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .garca-app-header-user-role {
                    color: rgba(255, 255, 255, 0.72);
                    font-size: 0.6875rem;
                    line-height: 1.3;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .garca-app-header-logout {
                    padding: 8px 14px;
                    min-height: 36px;
                    border: 1px solid rgba(255, 255, 255, 0.38);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.06);
                    color: #fff;
                    cursor: pointer;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    font-family: inherit;
                    white-space: nowrap;
                    transition: background 0.15s, border-color 0.15s;
                }
                .garca-app-header-logout:hover {
                    background: rgba(255, 255, 255, 0.14);
                    border-color: rgba(255, 255, 255, 0.55);
                }
                @media (max-width: 520px) {
                    .garca-app-header-inner {
                        padding-bottom: 14px;
                        gap: 10px;
                    }
                    .garca-app-header-user-meta { display: none; }
                    .garca-app-header-logout {
                        padding: 8px 12px;
                        font-size: 0.75rem;
                    }
                }
            `}</style>

            {/* Header */}
            <header className="garca-app-header">
                <div className="garca-app-header-inner">
                    <div className="garca-app-header-brand">
                        <img
                            src={HEADER_LOGO_CANDIDATES[headerLogoIndex] ?? HEADER_LOGO_CANDIDATES[0]}
                            alt="Garça Cidadão"
                            onError={() => setHeaderLogoIndex((prev) => Math.min(prev + 1, HEADER_LOGO_CANDIDATES.length - 1))}
                        />
                    </div>

                    {!isCommonUser ? (
                        <nav className="garca-app-header-nav" aria-label="Navegação administrativa">
                            {[
                                { key: 'dashboard', label: 'Dashboard' },
                                { key: 'ocorrencia', label: 'Cadastro de Ocorrência' },
                                { key: 'categorias', label: 'Cadastro de Categorias' },
                                { key: 'secretarias', label: 'Cadastro de Secretarias' },
                                { key: 'usuarios', label: 'Cadastro de Usuários' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`garca-app-header-nav-btn${activeTab === tab.key ? ' is-active' : ''}`}
                                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    ) : (
                        <nav className="garca-app-header-nav garca-app-header-nav--citizen" aria-label="Navegação do cidadão">
                            {[
                                { key: 'ocorrencia', label: 'Nova reclamação' },
                                { key: 'minhas', label: 'Minhas Reclamações' },
                                { key: 'privacidade', label: 'Privacidade (LGPD)' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`garca-app-header-nav-btn${activeTab === tab.key ? ' is-active' : ''}`}
                                    onClick={() => {
                                        setActiveTab(tab.key as typeof activeTab)
                                        if (tab.key === 'minhas') markNotificationsRead()
                                    }}
                                >
                                    {tab.label}
                                    {tab.key === 'minhas' && unreadNotifCount > 0 && (
                                        <span className="garca-nav-badge" aria-label={`${unreadNotifCount} atualizações`}>
                                            {unreadNotifCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </nav>
                    )}

                    <div className="garca-app-header-user">
                        {!isCommonUser && (
                            <div className="garca-app-header-status">
                                <span className="garca-app-header-status-dot" aria-hidden="true">●</span>
                                Sistema Online
                            </div>
                        )}
                        {user && (
                            <>
                                <div className="garca-app-header-user-meta">
                                    <div className="garca-app-header-user-name">{user.name}</div>
                                    <div className="garca-app-header-user-role">
                                        {USER_ROLE_LABEL[resolveEffectiveRole(user.role, user.secretariat_id)] ?? user.role} | {userSecName}
                                    </div>
                                </div>
                                <UserAvatar name={user.name} image={user.image} />
                            </>
                        )}
                        <button type="button" className="garca-app-header-logout" onClick={handleLogout}>
                            Sair
                        </button>
                    </div>
                </div>
            </header>

            {!isCommonUser && (
                <div style={{ background: 'white', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #dbe3f0', boxShadow: '0 2px 8px rgba(45, 64, 115, 0.06)' }}>
                    <button
                        type="button"
                        onClick={checkNewOccurrences}
                        disabled={checkingNewOccurrences}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            background: '#f8fafc',
                            color: '#334155',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            marginRight: 'auto',
                        }}
                    >
                        {checkingNewOccurrences ? 'Checando...' : 'Checar novas ocorrências'}
                    </button>
                    {canViewGeneralScope ? (
                        [{ key: 'mine', label: 'Minha secretaria' }, { key: 'all', label: 'Quadro geral' }].map((s) => (
                            <button key={s.key} onClick={() => setScope(s.key as typeof scope)}
                                style={{
                                    padding: '6px 14px', marginLeft: '8px', border: '1px solid',
                                    borderColor: scope === s.key ? '#3f51b5' : '#cbd5e1',
                                    background: scope === s.key ? '#3f51b5' : 'white',
                                    color: scope === s.key ? 'white' : '#475569',
                                    borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem',
                                    fontWeight: scope === s.key ? 700 : 400,
                                }}>
                                {s.label}
                            </button>
                        ))
                    ) : (
                        <span style={{
                            marginLeft: '8px',
                            border: '1px solid #3f51b5',
                            background: '#3f51b5',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '6px 14px',
                        }}>
                            Minha secretaria
                        </span>
                    )}
                </div>
            )}

            {/* Painel estratégico (KPI, mapa, métricas): apenas staff — não é "Boca no Trombone" */}
            {activeTab === 'dashboard' && !isCommonUser && (
                <div style={{ padding: '1.25rem 1.5rem' }}>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Carregando...</div>
                    ) : (
                        <div style={{ background: 'white', border: '1px solid #dbe3f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.5rem', boxShadow: '0 6px 16px rgba(45, 64, 115, 0.08)' }}>
                            {/* Panel title */}
                            <div style={{ background: '#3f51b5', padding: '10px 20px' }}>
                                <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '1px' }}>
                                    PAINEL ESTRATEGICO
                                </span>
                            </div>

                            <div style={{ padding: '1.25rem' }}>
                                {/* KPI Cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                                    {[
                                        { label: 'OCORRENCIAS', value: scopeOccs.length, color: '#1e3a5f', bg: '#f0f4ff', filter: 'all' as const },
                                        { label: 'CRITICAS (RED)', value: critical.length, color: '#ef4444', bg: '#fff1f2', filter: 'critical' as const },
                                        { label: 'ATRASADAS', value: overdue.length, color: '#10b981', bg: '#f0fdf4', filter: 'overdue' as const },
                                        { label: 'RESOLUCAO', value: `${resolutionRate}%`, color: '#0ea5e9', bg: '#f0f9ff', filter: 'resolved' as const },
                                    ].map((c) => (
                                        <div
                                            key={c.label}
                                            onClick={() => setKpiListFilter(c.filter)}
                                            style={{ background: c.bg, border: `1px solid ${c.color}30`, borderRadius: '8px', padding: '1rem 1.25rem', cursor: 'pointer' }}
                                        >
                                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>{c.label}</div>
                                            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* 2 columns */}
                                <div style={{ display: 'grid', gridTemplateColumns: '270px 1fr', gap: '1rem' }}>

                                    {/* LEFT */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {critical.length > 0 && (
                                            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', padding: '0.75rem' }}>
                                                <div style={{ color: '#be123c', fontWeight: 700, fontSize: '0.85rem', marginBottom: '4px' }}>⚠️ Alertas Estratégicos</div>
                                                <div style={{ fontSize: '0.82rem', color: '#9f1239' }}>
                                                    {critical.length} ocorrencia(s) critica(s) ativa(s) com foco prioritário.
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.6rem', color: '#1e293b' }}>Prioridade Máxima (Top 5)</div>
                                            {topPriority.length === 0
                                                ? <div style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>Nenhuma.</div>
                                                : topPriority.map((o) => (
                                                    <div
                                                        key={o.id}
                                                        onClick={() => openOccurrenceDetails(o)}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            padding: '6px 8px',
                                                            marginBottom: '4px',
                                                            background: '#f8fafc',
                                                            borderRadius: '5px',
                                                            border: '1px solid #f1f5f9',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '0.8rem', color: '#334155' }}>{o.title}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {isSocialRiskOccurrence(o) && (
                                                                <span style={{ background: '#7f1d1d', color: 'white', fontSize: '0.58rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                                                                    RISCO REDE
                                                                </span>
                                                            )}
                                                            <span style={{ background: URGENCY_COLOR[o.urgency] ?? '#64748b', color: 'white', fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>
                                                                {URGENCY_LABEL[o.urgency]?.toUpperCase() ?? o.urgency.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    {/* CENTER: map */}
                                    <div>
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                            <select value={secretariatFilter} onChange={(e) => setSecretariatFilter(e.target.value)}
                                                style={{ padding: '5px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                                                <option value="todas">Secretaria: todas</option>
                                                {secretariats.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                                            </select>
                                            <input type="text" placeholder="Bairro" value={neighborhoodFilter}
                                                onChange={(e) => setNeighborhoodFilter(e.target.value)}
                                                style={{ padding: '5px 8px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '100px' }} />
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e3a5f', marginBottom: '6px' }}>
                                            Mapa de Calor ({mapOccs.filter(hasValidGeo).length} pontos)
                                        </div>
                                        <HeatmapView
                                            points={heatmapPoints}
                                            occurrences={mapOccs}
                                            categories={categories}
                                            allowHeatmapApiFallback={secretariatFilter === 'todas' && !neighborhoodFilter.trim()}
                                        />
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.68rem', color: '#64748b' }}>
                                            <span>🔴 Crítico &nbsp; 🟠 Alta &nbsp; 🟡 Média &nbsp; 🟢 Baixa</span>
                                            <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>© OpenStreetMap</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bottom KPI row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                        {[
                            { label: 'OCORRENCIAS TOTAIS', value: scopeOccs.length, highlight: false, sub: null },
                            { label: 'OCORRENCIAS CRÍTICAS', value: critical.length, highlight: true, sub: null },
                            { label: 'OCORRENCIAS ATIVAS', value: active.length, highlight: false, sub: null },
                            { label: 'SECRETARIA COM MAIOR INCIDÊNCIA', value: bySecretariat[0]?.count ?? 0, highlight: false, sub: bySecretariat[0]?.full },
                            { label: 'SECRETARIAS COM OCORRÊNCIAS', value: bySecretariat.length, highlight: false, sub: null },
                        ].map((c) => (
                            <div key={c.label} style={{
                                background: c.highlight ? '#ef4444' : 'white',
                                color: c.highlight ? 'white' : '#1e293b',
                                borderRadius: '10px', padding: '1rem',
                                border: c.highlight ? 'none' : '1px solid #e2e8f0',
                            }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 700, marginBottom: '4px', opacity: c.highlight ? .9 : .55 }}>
                                    {c.label}
                                    {c.highlight && <span style={{ background: 'white', color: '#ef4444', fontSize: '0.5rem', padding: '1px 5px', borderRadius: '3px', marginLeft: '5px', fontWeight: 800 }}>ATENÇÃO</span>}
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{c.value}</div>
                                {c.sub && <div style={{ fontSize: '0.7rem', marginTop: '4px', opacity: .7 }}>{c.sub}</div>}
                            </div>
                        ))}
                    </div>

                    {/* Occurrence lists & Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Últimas ocorrências */}
                            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', height: '440px', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#1e293b' }}>Últimas ocorrencias</h3>
                                <input type="text" placeholder="Pesquisar ocorrencia por titulo, descricao, status ou remetente"
                                    value={search} onChange={(e) => setSearch(e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', marginBottom: '10px', boxSizing: 'border-box' }} />
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {activeList.length === 0
                                        ? <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '1rem' }}>Nenhuma ocorrência ativa.</div>
                                        : activeList.slice(0, 10).map((o) => <OccurrenceCard key={o.id} occ={o} onClick={openOccurrenceDetails} />)
                                    }
                                </div>
                            </div>

                            {/* Quantidade de ocorrencias por status */}
                            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', height: '220px' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#1e3a5f' }}>Quantidade de ocorrencias por status</h3>
                                <ResponsiveContainer width="100%" height="80%">
                                    <BarChart data={byStatus}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                            {byStatus.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Ocorrencias por secretaria */}
                            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', height: '220px' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#1e3a5f' }}>Ocorrencias por secretaria</h3>
                                {bySecretariat.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '2rem' }}>Sem dados.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart data={bySecretariat.slice(0, 6)} layout="vertical" margin={{ left: 25 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                                {bySecretariat.slice(0, 6).map((entry, index) => (
                                                    <Cell key={`sec-cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Ocorrencias por tema */}
                            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', height: '220px' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#1e3a5f' }}>Ocorrencias por tema de reclamacao</h3>
                                {byCategory.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '2rem' }}>Sem dados.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart data={byCategory} layout="vertical" margin={{ left: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                            <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                                                {byCategory.map((entry, index) => (
                                                    <Cell key={`cat-cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Top por criticidade */}
                            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', height: '440px', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#1e293b' }}>Top ocorrencias por criticidade</h3>
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {topList.length === 0
                                        ? <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '1rem' }}>Nenhuma.</div>
                                        : topList.map((o) => <OccurrenceCard key={o.id} occ={o} onClick={openOccurrenceDetails} />)
                                    }
                                </div>
                            </div>

                            {/* Quantidade por urgência */}
                            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <h3 style={{ margin: '0 0 0', fontSize: '0.85rem', color: '#1e3a5f', alignSelf: 'flex-start' }}>Quantidade de ocorrencias por urgencia</h3>
                                {byUrgency.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginTop: '3rem' }}>Sem dados.</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={160}>
                                        <PieChart>
                                            <Pie
                                                data={byUrgency}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={60}
                                                paddingAngle={2}
                                                dataKey="value"
                                                labelLine={false}
                                                label={false}
                                            >
                                                {byUrgency.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend iconType="square" wrapperStyle={{ fontSize: '0.75rem' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Evolução */}
                            <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', height: '220px' }}>
                                <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#1e3a5f' }}>Evolucao de ocorrencias (7 dias)</h3>
                                <ResponsiveContainer width="100%" height="80%">
                                    <LineChart data={evolutionData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Histórico encerradas */}
                    <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e3a5f' }}>Historico de ocorrencias encerradas</h3>
                            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{resolvedList.length} encerrada(s)</span>
                        </div>
                        {resolvedList.length === 0
                            ? <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', padding: '1rem' }}>Nenhuma encerrada.</div>
                            : resolvedList.slice(0, 20).map((o) => (
                                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ background: '#22c55e', color: 'white', padding: '2px 10px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Encerrada</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{o.title}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>score {o.priority_score}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Enviado por: {o.reporter_role ?? 'Não informado'}</span>
                                </div>
                            ))
                        }
                    </div>

                </div>
            )}

            {selectedListOccurrence && (
                <div
                    onClick={() => setSelectedListOccurrence(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15,23,42,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '16px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '920px',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            background: 'white',
                            borderRadius: '12px',
                            border: '1px solid #dbe3f0',
                            padding: '1rem',
                            boxShadow: '0 18px 40px rgba(2,6,23,.25)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e3a5f' }}>Detalhes da ocorrência</h3>
                            <button
                                type="button"
                                onClick={() => setSelectedListOccurrence(null)}
                                style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                                Fechar
                            </button>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: '6px' }}>{selectedListOccurrence.title}</div>
                        <div style={{ fontSize: '0.84rem', color: '#334155', marginBottom: '10px', whiteSpace: 'pre-wrap' }}>
                            {selectedListOccurrence.description || 'Sem descrição.'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Status:</strong> {STATUS_LABEL[selectedListOccurrence.status] ?? selectedListOccurrence.status}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Urgência:</strong> {URGENCY_LABEL[selectedListOccurrence.urgency] ?? selectedListOccurrence.urgency}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Score:</strong> {selectedListOccurrence.priority_score}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Secretaria:</strong> {secretariatName(selectedListOccurrence.secretariat_id)}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Criada em:</strong> {new Date(selectedListOccurrence.created_at).toLocaleString('pt-BR')}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Prazo:</strong> {selectedListOccurrence.due_at ? new Date(selectedListOccurrence.due_at).toLocaleString('pt-BR') : '—'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Resolvida em:</strong> {selectedListOccurrence.resolved_at ? new Date(selectedListOccurrence.resolved_at).toLocaleString('pt-BR') : '—'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Recorrência:</strong> {selectedListOccurrence.recurrence_count ?? 0} (nível {selectedListOccurrence.recurrence_level ?? 0})</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Endereço:</strong> {getOccurrenceAddress(selectedListOccurrence)}</div>
                        </div>
                        {canManageOccurrenceStatus ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 700 }}>Alterar status:</label>
                                <select
                                    value={statusDraft}
                                    onChange={(e) => setStatusDraft(e.target.value as Occurrence['status'])}
                                    style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                >
                                    <option value="open">Ativa</option>
                                    <option value="in_progress">Em execução</option>
                                    <option value="resolved">Encerrada</option>
                                    <option value="canceled">Cancelada</option>
                                </select>
                                <button
                                    type="button"
                                    disabled={updatingOccurrenceStatus || statusDraft === selectedListOccurrence.status}
                                    onClick={updateOccurrenceStatus}
                                    style={{ padding: '6px 10px', border: 'none', borderRadius: '6px', background: '#3f51b5', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                                >
                                    {updatingOccurrenceStatus ? 'Salvando...' : 'Salvar status'}
                                </button>
                            </div>
                        ) : (
                            <div style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                                Apenas usuários de secretaria/admin podem alterar o status.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {triageOccurrence && hasSecretaryLikePermissions(resolveEffectiveRole(user?.role, user?.secretariat_id)) && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15,23,42,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2100,
                        padding: '16px',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            maxWidth: '760px',
                            background: 'white',
                            borderRadius: '12px',
                            border: '1px solid #dbe3f0',
                            padding: '1rem',
                            boxShadow: '0 18px 40px rgba(2,6,23,.28)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#991b1b' }}>Nova ocorrência de cidadão para triagem</h3>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(triageOccurrence.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>{triageOccurrence.title}</div>
                        <div style={{ fontSize: '0.82rem', color: '#334155', marginBottom: '10px', whiteSpace: 'pre-wrap' }}>
                            {triageOccurrence.description || 'Sem descrição.'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Secretaria:</strong> {secretariatName(triageOccurrence.secretariat_id)}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Endereço:</strong> {getOccurrenceAddress(triageOccurrence)}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Status atual:</strong> {STATUS_LABEL[triageOccurrence.status] ?? triageOccurrence.status}</div>
                            <div style={{ fontSize: '0.78rem', color: '#475569' }}><strong>Criticidade atual:</strong> {URGENCY_LABEL[triageOccurrence.urgency] ?? triageOccurrence.urgency}</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ display: 'grid', gap: '4px' }}>
                                <label style={{ fontSize: '0.76rem', color: '#334155', fontWeight: 700 }}>Definir criticidade</label>
                                <select
                                    value={triageUrgencyDraft}
                                    onChange={(e) => setTriageUrgencyDraft(e.target.value as Occurrence['urgency'])}
                                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                >
                                    <option value="critical">Crítica</option>
                                    <option value="high">Alta</option>
                                    <option value="medium">Média</option>
                                    <option value="low">Baixa</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gap: '4px' }}>
                                <label style={{ fontSize: '0.76rem', color: '#334155', fontWeight: 700 }}>Definir status</label>
                                <select
                                    value={triageStatusDraft}
                                    onChange={(e) => setTriageStatusDraft(e.target.value as Occurrence['status'])}
                                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                >
                                    <option value="open">Ativa</option>
                                    <option value="in_progress">Em execução</option>
                                    <option value="resolved">Encerrada</option>
                                    <option value="canceled">Cancelada</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={deferTriageOccurrence}
                                style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
                            >
                                Lembrar depois
                            </button>
                            <button
                                type="button"
                                onClick={submitTriageOccurrence}
                                disabled={triageSaving}
                                style={{ padding: '8px 12px', border: 'none', borderRadius: '6px', background: '#dc2626', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
                            >
                                {triageSaving ? 'Salvando...' : 'Salvar triagem'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {kpiListFilter && (
                <div
                    onClick={() => setKpiListFilter(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15,23,42,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2050,
                        padding: '16px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '980px',
                            maxHeight: '88vh',
                            overflowY: 'auto',
                            background: 'white',
                            borderRadius: '12px',
                            border: '1px solid #dbe3f0',
                            padding: '1rem',
                            boxShadow: '0 18px 40px rgba(2,6,23,.25)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e3a5f' }}>{kpiListTitle}</h3>
                            <button
                                type="button"
                                onClick={() => setKpiListFilter(null)}
                                style={{ padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                                Fechar
                            </button>
                        </div>
                        {kpiListItems.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '1rem' }}>
                                Nenhuma ocorrência encontrada para este card.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {kpiListItems.map((o) => (
                                    <OccurrenceCard key={`${kpiListFilter}-${o.id}`} occ={o} onClick={(occ) => {
                                        setKpiListFilter(null)
                                        openOccurrenceDetails(occ)
                                    }} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'ocorrencia' && (
                <div className="garca-ocorrencia-wrap">
                    <div className="garca-ocorrencia-card">
                        {!editingOccurrenceId && isCommonUser ? (
                            <div className="garca-ocorrencia-hero garca-ocorrencia-hero--citizen" aria-labelledby="garca-boca-heading">
                                <div className="garca-boca-hero-grid">
                                    <div className="garca-boca-hero-copy">
                                        <span className="garca-boca-badge">CANAL CIDADÃO</span>
                                        <h1 id="garca-boca-heading" className="garca-boca-title">Boca no Trombone</h1>
                                        <p className="garca-boca-sub">Sua voz chega à Prefeitura</p>
                                        <p className="garca-boca-hint">
                                            Registre reclamações e ocorrências da cidade de forma simples. Escolha o tipo do problema,
                                            descreva o que aconteceu e informe o endereço — a secretaria responsável será definida automaticamente.
                                        </p>
                                    </div>
                                    <div className="garca-boca-hero-icon" aria-hidden="true">
                                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 10v4a2 2 0 0 0 2 2h1l3 4v-16l-3 4H6a2 2 0 0 0-2 2z" fill="currentColor" opacity="0.95"/>
                                            <path d="M15 8.5a4.5 4.5 0 0 1 0 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M17.5 6a7 7 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        <div className={`garca-ocorrencia-card-inner ${!editingOccurrenceId && isCommonUser ? 'garca-ocorrencia-card-inner--after-hero' : ''}`.trim()}>
                            {(editingOccurrenceId || !isCommonUser) && (
                                <div className="garca-ocorrencia-header-block">
                                    <h2 className="garca-ocorrencia-heading">
                                        {editingOccurrenceId ? 'Editar ocorrência' : 'Nova ocorrência'}
                                    </h2>
                                    <p className="garca-ocorrencia-lead">
                                        Preencha os dados abaixo. A secretaria será definida automaticamente pela categoria escolhida.
                                    </p>
                                </div>
                            )}
                            <form onSubmit={submitOccurrence} className="garca-ocorrencia-form">
                            {!editingOccurrenceId && isCommonUser && (
                                <nav className="garca-boca-steps" aria-label="Etapas do registro">
                                    <div className={`garca-boca-step-pill ${occForm.category_id ? 'is-done' : 'is-active'}`}>
                                        <span>1</span>
                                        Categoria
                                    </div>
                                    <div className={`garca-boca-step-pill ${occForm.category_id ? (occForm.title.trim() || occForm.description.trim() ? 'is-done' : 'is-active') : ''}`}>
                                        <span>2</span>
                                        Descrição
                                    </div>
                                    <div className={`garca-boca-step-pill ${occForm.category_id && (occForm.cep.trim() || occForm.address.trim()) ? 'is-active' : ''} ${occForm.category_id && occForm.address.trim() && occForm.neighborhood.trim() ? 'is-done' : ''}`}>
                                        <span>3</span>
                                        Local
                                    </div>
                                    <div className={`garca-boca-step-pill ${occForm.category_id ? 'is-active' : ''}`}>
                                        <span>4</span>
                                        Enviar
                                    </div>
                                </nav>
                            )}

                            <section className={`garca-boca-step ${occForm.category_id ? 'garca-boca-step--unlocked' : 'garca-boca-step--locked'}`} aria-labelledby="boca-step-categoria">
                                <h3 className="garca-boca-step-title" id="boca-step-categoria">
                                    <span>1</span>
                                    Categoria da reclamação
                                </h3>
                                <p className="garca-boca-step-lead">Selecione o tipo de problema para encaminhar à secretaria correta.</p>
                                <div>
                                    <label className="garca-field-label" htmlFor="boca-category">
                                        Categoria <small>(obrigatório)</small>
                                    </label>
                                    <select
                                        id="boca-category"
                                        className="garca-field garca-field--highlight"
                                        value={occForm.category_id}
                                        onChange={(e) => {
                                            const nextCategoryId = e.target.value
                                            const selectedCategory = categories.find((c) => c.id === nextCategoryId)
                                            setOccForm((prev) => ({
                                                ...prev,
                                                category_id: nextCategoryId,
                                                secretariat_id: selectedCategory?.secretariat_id || '',
                                            }))
                                        }}
                                        required
                                    >
                                        <option value="">Selecione a categoria</option>
                                        {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                </div>
                                <div className={`garca-secretariat-row ${occForm.secretariat_id ? 'is-set' : ''}`} role="status">
                                    <span>Secretaria</span>
                                    <span>
                                        {occForm.secretariat_id ? secretariatName(occForm.secretariat_id) : 'Será definida automaticamente após escolher a categoria'}
                                    </span>
                                </div>
                                {!occForm.category_id && (
                                    <div className="garca-ocorrencia-alert" role="status">
                                        Escolha uma categoria para habilitar os demais campos do formulário.
                                    </div>
                                )}
                            </section>

                            <section className={`garca-boca-step ${occForm.category_id ? 'garca-boca-step--unlocked' : 'garca-boca-step--locked'}`} aria-labelledby="boca-step-descricao">
                                <h3 className="garca-boca-step-title" id="boca-step-descricao">
                                    <span>2</span>
                                    Descrição do problema
                                </h3>
                                <p className="garca-boca-step-lead">Explique com clareza o que está acontecendo na sua região.</p>
                                <div>
                                    <label className="garca-field-label" htmlFor="boca-title">Título resumido</label>
                                    <input
                                        id="boca-title"
                                        className="garca-field"
                                        value={occForm.title}
                                        onChange={(e) => setOccForm((prev) => ({ ...prev, title: e.target.value }))}
                                        placeholder="Ex.: Buraco na rua, falta de iluminação..."
                                        disabled={!occForm.category_id}
                                    />
                                </div>
                                {!isCommonUser && (
                                    <div>
                                        <label className="garca-field-label" htmlFor="boca-urgency">Urgência</label>
                                        <select
                                            id="boca-urgency"
                                            className="garca-field"
                                            value={occForm.urgency}
                                            onChange={(e) => setOccForm((prev) => ({ ...prev, urgency: e.target.value }))}
                                            disabled={!occForm.category_id}
                                        >
                                            <option value="critical">Crítica</option>
                                            <option value="high">Alta</option>
                                            <option value="medium">Média</option>
                                            <option value="low">Baixa</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="garca-field-label" htmlFor="boca-description">Descrição detalhada</label>
                                    <textarea
                                        id="boca-description"
                                        className="garca-field garca-field--textarea"
                                        value={occForm.description}
                                        onChange={(e) => setOccForm((prev) => ({ ...prev, description: e.target.value }))}
                                        placeholder="Descreva a ocorrência com o máximo de detalhes possível..."
                                        disabled={!occForm.category_id}
                                    />
                                </div>
                            </section>

                            <section className={`garca-boca-step ${occForm.category_id ? 'garca-boca-step--unlocked' : 'garca-boca-step--locked'}`} aria-labelledby="boca-step-local">
                                <h3 className="garca-boca-step-title" id="boca-step-local">
                                    <span>3</span>
                                    Localização
                                </h3>
                                <p className="garca-boca-step-lead">Informe o CEP ou endereço para localizar a ocorrência no mapa.</p>
                                <div className="garca-ocorrencia-cep-row">
                                    <div style={{ flex: 1 }}>
                                        <label className="garca-field-label" htmlFor="boca-cep">CEP</label>
                                        <input
                                            id="boca-cep"
                                            className="garca-field"
                                            value={occForm.cep}
                                            onChange={(e) => setOccForm((prev) => ({ ...prev, cep: e.target.value }))}
                                            onBlur={lookupCep}
                                            placeholder="00000-000"
                                            disabled={!occForm.category_id}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <button
                                            type="button"
                                            className="garca-btn garca-btn--secondary"
                                            style={{ width: '100%', minHeight: '48px' }}
                                            onClick={lookupCep}
                                            disabled={loadingCep || !occForm.category_id}
                                        >
                                            {loadingCep ? 'Buscando...' : 'Buscar CEP'}
                                        </button>
                                    </div>
                                </div>
                                <div className="garca-address-grid">
                                    <div className="garca-field-span-2">
                                        <label className="garca-field-label" htmlFor="boca-address">Endereço</label>
                                        <input
                                            id="boca-address"
                                            className="garca-field"
                                            value={occForm.address}
                                            onChange={(e) => setOccForm((prev) => ({ ...prev, address: e.target.value }))}
                                            placeholder="Rua, avenida..."
                                            disabled={!occForm.category_id}
                                        />
                                    </div>
                                    <div>
                                        <label className="garca-field-label" htmlFor="boca-number">Número</label>
                                        <input
                                            id="boca-number"
                                            className="garca-field"
                                            value={occForm.number}
                                            onChange={(e) => setOccForm((prev) => ({ ...prev, number: e.target.value }))}
                                            placeholder="Nº"
                                            disabled={!occForm.category_id}
                                        />
                                    </div>
                                    <div className="garca-field-span-2">
                                        <label className="garca-field-label" htmlFor="boca-neighborhood">Bairro</label>
                                        <input
                                            id="boca-neighborhood"
                                            className="garca-field"
                                            value={occForm.neighborhood}
                                            onChange={(e) => setOccForm((prev) => ({ ...prev, neighborhood: e.target.value }))}
                                            placeholder="Bairro"
                                            disabled={!occForm.category_id}
                                        />
                                    </div>
                                    <div>
                                        <label className="garca-field-label" htmlFor="boca-city">Cidade</label>
                                        <input
                                            id="boca-city"
                                            className="garca-field"
                                            value={occForm.city}
                                            onChange={(e) => setOccForm((prev) => ({ ...prev, city: e.target.value }))}
                                            placeholder="Cidade"
                                            disabled={!occForm.category_id}
                                        />
                                    </div>
                                    <div>
                                        <label className="garca-field-label" htmlFor="boca-state">UF</label>
                                        <input
                                            id="boca-state"
                                            className="garca-field"
                                            value={occForm.state}
                                            onChange={(e) => setOccForm((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
                                            placeholder="UF"
                                            maxLength={2}
                                            disabled={!occForm.category_id}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className={`garca-boca-step ${occForm.category_id ? 'garca-boca-step--unlocked' : 'garca-boca-step--locked'}`} aria-labelledby="boca-step-envio">
                                <h3 className="garca-boca-step-title" id="boca-step-envio">
                                    <span>4</span>
                                    Confirmação e envio
                                </h3>
                                <div className="garca-ocorrencia-readonly">
                                    <strong style={{ marginRight: 6 }}>Secretaria responsável:</strong>
                                    {occForm.secretariat_id ? secretariatName(occForm.secretariat_id) : 'Definida após seleção da categoria'}
                                </div>
                                <div className="garca-ocorrencia-footer">
                                    <div className="garca-ocorrencia-footer-note">
                                        As coordenadas serão definidas automaticamente com base no endereço informado.
                                    </div>
                                    <div className="garca-ocorrencia-footer-actions">
                                        <button type="submit" className="garca-btn garca-btn--primary" disabled={submittingOccurrence || !occForm.category_id}>
                                            {submittingOccurrence ? 'Salvando...' : (editingOccurrenceId ? 'Atualizar Ocorrência' : 'Salvar Ocorrência')}
                                        </button>
                                        {editingOccurrenceId && (
                                            <button
                                                type="button"
                                                className="garca-btn garca-btn--ghost"
                                                onClick={cancelOccurrenceEdit}
                                            >
                                                Cancelar edição
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </form>
                        {!isCommonUser && (
                            <div className="garca-ocorrencia-staff-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <h3 style={{ margin: 0, fontSize: '0.96rem', color: '#1e3a8a' }}>Localizar ocorrência</h3>
                                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                        {manageOccurrenceList.length} ocorrência(s) encontrada(s)
                                    </div>
                                </div>
                                <input
                                    value={occurrenceSearch}
                                    onChange={(e) => setOccurrenceSearch(e.target.value)}
                                    placeholder="Buscar por título, descrição, endereço, status, urgência ou secretaria"
                                    style={{ padding: '10px 12px', border: '1px solid #dbe3f0', borderRadius: '8px', background: '#fff' }}
                                />
                                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                                    {manageOccurrenceList.length === 0 ? (
                                        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Nenhuma ocorrência encontrada com esse filtro.</div>
                                    ) : (
                                        manageOccurrenceList.slice(0, 50).map((occ) => (
                                            <div key={occ.id} style={{ border: '1px solid #dbe3f0', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{occ.title}</div>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => openOccurrenceDetails(occ)}
                                                            style={{ padding: '3px 8px', border: '1px solid #bfdbfe', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                        >
                                                            Abrir
                                                        </button>
                                                        {canManageOccurrenceStatus && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEditOccurrence(occ)}
                                                                    style={{ padding: '3px 8px', border: '1px solid #93c5fd', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                                >
                                                                    Editar
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteOccurrenceById(occ)}
                                                                    style={{ padding: '3px 8px', border: '1px solid #fecaca', borderRadius: '6px', background: '#fef2f2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                                >
                                                                    Excluir
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ marginTop: '4px', fontSize: '0.74rem', color: '#64748b' }}>{occ.description || 'Sem descrição'}</div>
                                                <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#334155' }}>
                                                    {STATUS_LABEL[occ.status] ?? occ.status} | {URGENCY_LABEL[occ.urgency] ?? occ.urgency} | {secretariatName(occ.secretariat_id)} | {new Date(occ.created_at).toLocaleString('pt-BR')}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {manageOccurrenceList.length > 50 && (
                                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                        Exibindo as 50 mais recentes. Use o filtro para refinar.
                                    </div>
                                )}
                            </div>
                        )}
                        </div>
                    </div>
                </div>
            )}

            <CitizenSuccessModal
                open={successModalOpen}
                occurrence={successOccurrence}
                onTrack={() => {
                    setSuccessModalOpen(false)
                    setActiveTab('minhas')
                    if (successOccurrence) setDeepLinkOccurrenceId(successOccurrence.id)
                    void markNotificationsRead()
                }}
                onHome={() => {
                    setSuccessModalOpen(false)
                    setActiveTab('ocorrencia')
                }}
            />

            {activeTab === 'minhas' && isCommonUser && (
                <MyComplaintsPanel
                    apiBase={API}
                    getHeaders={getAuthHeaders}
                    fetchJson={fetchJsonWithTimeout}
                    secretariatName={secretariatName}
                    categoryName={categoryName}
                    initialOccurrenceId={deepLinkOccurrenceId}
                    unreadCount={unreadNotifCount}
                    onRefreshNotifications={() => void markNotificationsRead()}
                />
            )}

            {activeTab === 'privacidade' && isCommonUser && user && (
                <CitizenPrivacyPanel
                    apiBase={API}
                    getHeaders={getAuthHeaders}
                    userEmail={user.email}
                    onAccountDeleted={handleLogout}
                />
            )}

            {activeTab === 'categorias' && (
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '420px 1fr', gap: '1rem' }}>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                        <h2 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.1rem' }}>
                            {editingCategoryId ? 'Editar Categoria' : 'Cadastro de Categorias'}
                        </h2>
                        <button
                            type="button"
                            onClick={importSocialRiskCategories}
                            disabled={importingRiskCategories}
                            style={{ width: '100%', marginBottom: '10px', padding: '8px 12px', border: '1px solid #fecaca', borderRadius: '6px', background: '#fff1f2', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            {importingRiskCategories ? 'Importando categorias de risco...' : 'Importar categorias de risco (redes sociais)'}
                        </button>
                        <div style={{ marginBottom: '10px', fontSize: '0.74rem', color: '#64748b' }}>
                            Importa automaticamente as 20 categorias sensíveis para monitoramento de risco em redes sociais.
                        </div>
                        <form onSubmit={submitCategory} style={{ display: 'grid', gap: '10px' }}>
                            <input
                                name="title"
                                value={catForm.title}
                                onChange={(e) => setCatForm((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="Título da categoria"
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <textarea
                                name="description"
                                value={catForm.description}
                                onChange={(e) => setCatForm((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Descrição"
                                style={{ minHeight: '80px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical' }}
                            />
                            <select
                                name="secretariat_id"
                                value={catForm.secretariat_id}
                                onChange={(e) => setCatForm((prev) => ({ ...prev, secretariat_id: e.target.value }))}
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            >
                                <option value="">Selecione a secretaria</option>
                                {secretariats.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                            <div style={{ display: 'grid', gap: '4px' }}>
                                <label style={{ fontSize: '0.78rem', color: '#334155', fontWeight: 600 }}>SLA (dias)</label>
                                <input
                                    name="sla_days"
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={catForm.sla_days}
                                    onChange={(e) => setCatForm((prev) => ({ ...prev, sla_days: Number(e.target.value) || 5 }))}
                                    placeholder="SLA (dias)"
                                    style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="submit" disabled={submittingCategory} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                                    {submittingCategory ? 'Salvando...' : (editingCategoryId ? 'Atualizar Categoria' : 'Salvar Categoria')}
                                </button>
                                {editingCategoryId && (
                                    <button
                                        type="button"
                                        onClick={cancelCategoryEdit}
                                        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                            {!canCreateCategory && (
                                <div style={{ fontSize: '0.78rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', padding: '8px 10px' }}>
                                    Você precisa estar autenticado como admin ou secretário para cadastrar categorias.
                                </div>
                            )}
                        </form>
                    </div>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                        <h3 style={{ margin: '0 0 10px', color: '#1e3a5f', fontSize: '1rem' }}>Categorias existentes</h3>
                        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                            {categories.length === 0 ? (
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Nenhuma categoria carregada.</div>
                            ) : (
                                categories.map((c) => (
                                    <div key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{c.title}</div>
                                            {canCreateCategory && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditCategory(c)}
                                                        style={{ padding: '3px 8px', border: '1px solid #93c5fd', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteCategoryById(c)}
                                                        style={{ padding: '3px 8px', border: '1px solid #fecaca', borderRadius: '6px', background: '#fef2f2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{c.description}</div>
                                        <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#334155' }}>
                                            Secretaria: {secretariatName(c.secretariat_id)} | SLA: {c.sla_days} dia(s)
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'secretarias' && (
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '420px 1fr', gap: '1rem' }}>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                        <h2 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.1rem' }}>
                            {editingSecretariatId ? 'Editar Secretaria' : 'Cadastro de Secretarias'}
                        </h2>
                        <form onSubmit={submitSecretariat} style={{ display: 'grid', gap: '10px' }}>
                            <input
                                name="title"
                                value={secForm.title}
                                onChange={(e) => setSecForm((prev) => ({ ...prev, title: e.target.value }))}
                                placeholder="Nome da secretaria"
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <input
                                name="sigla"
                                value={secForm.sigla}
                                onChange={(e) => setSecForm((prev) => ({ ...prev, sigla: e.target.value.toUpperCase() }))}
                                placeholder="Sigla"
                                maxLength={20}
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <input
                                name="phone"
                                value={secForm.phone}
                                onChange={(e) => setSecForm((prev) => ({ ...prev, phone: e.target.value }))}
                                placeholder="Telefone"
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <input
                                name="email"
                                type="email"
                                value={secForm.email}
                                onChange={(e) => setSecForm((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="E-mail"
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <textarea
                                name="address"
                                value={secForm.address}
                                onChange={(e) => setSecForm((prev) => ({ ...prev, address: e.target.value }))}
                                placeholder="Endereço"
                                style={{ minHeight: '80px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="submit" disabled={submittingSecretariat} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                                    {submittingSecretariat ? 'Salvando...' : (editingSecretariatId ? 'Atualizar Secretaria' : 'Salvar Secretaria')}
                                </button>
                                {editingSecretariatId && (
                                    <button
                                        type="button"
                                        onClick={cancelSecretariatEdit}
                                        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                            {!canCreateSecretariat && (
                                <div style={{ fontSize: '0.78rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', padding: '8px 10px' }}>
                                    Você precisa estar autenticado como admin para cadastrar secretarias.
                                </div>
                            )}
                        </form>
                    </div>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                        <h3 style={{ margin: '0 0 10px', color: '#1e3a5f', fontSize: '1rem' }}>Secretarias existentes</h3>
                        <input
                            value={secretariatSearch}
                            onChange={(e) => setSecretariatSearch(e.target.value)}
                            placeholder="Filtrar por nome, sigla, e-mail, telefone ou endereço"
                            style={{ width: '100%', marginBottom: '10px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        />
                        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                            {filteredSecretariats.length === 0 ? (
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Nenhuma secretaria carregada.</div>
                            ) : (
                                filteredSecretariats.map((s) => (
                                    <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{s.title} ({s.sigla || '—'})</div>
                                            {canCreateSecretariat && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditSecretariat(s)}
                                                        style={{ padding: '3px 8px', border: '1px solid #93c5fd', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteSecretariatById(s)}
                                                        style={{ padding: '3px 8px', border: '1px solid #fecaca', borderRadius: '6px', background: '#fef2f2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{s.email}</div>
                                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{s.phone}</div>
                                        <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#334155' }}>{s.address}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'usuarios' && (
                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '420px 1fr', gap: '1rem' }}>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                        <h2 style={{ margin: '0 0 12px', color: '#1e3a5f', fontSize: '1.1rem' }}>
                            {editingUserId ? 'Editar Usuário' : 'Cadastro de Usuários'}
                        </h2>
                        <form onSubmit={submitUser} style={{ display: 'grid', gap: '10px' }}>
                            <input
                                value={userForm.name}
                                onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Nome completo"
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <input
                                type="email"
                                value={userForm.email}
                                onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="E-mail"
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <input
                                value={userForm.image}
                                onChange={(e) => setUserForm((prev) => ({ ...prev, image: e.target.value }))}
                                placeholder="URL da foto do usuário (opcional)"
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <input
                                type="password"
                                value={userForm.password}
                                onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                                placeholder={editingUserId ? 'Nova senha (opcional)' : 'Senha'}
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                            <select
                                value={userForm.role}
                                onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value, secretariat_id: e.target.value === 'secretary' || e.target.value === 'prefeito' ? prev.secretariat_id : '' }))}
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            >
                                <option value="">Selecione o perfil</option>
                                <option value="citizen">Perfil: Cidadão</option>
                                <option value="secretary">Perfil: Secretário</option>
                                <option value="prefeito">Perfil: Prefeito</option>
                                <option value="admin">Perfil: Admin</option>
                            </select>
                            <select
                                value={userForm.secretariat_id}
                                onChange={(e) => setUserForm((prev) => ({ ...prev, secretariat_id: e.target.value }))}
                                disabled={userForm.role !== 'secretary' && userForm.role !== 'prefeito'}
                                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            >
                                <option value="">Selecione a secretaria</option>
                                {secretariats.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="submit" disabled={submittingUser} style={{ flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px', background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                                    {submittingUser ? 'Salvando...' : (editingUserId ? 'Atualizar Usuário' : 'Salvar Usuário')}
                                </button>
                                {editingUserId && (
                                    <button
                                        type="button"
                                        onClick={cancelUserEdit}
                                        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                            {!canCreateUser && (
                                <div style={{ fontSize: '0.78rem', color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', padding: '8px 10px' }}>
                                    Você precisa estar autenticado como admin para cadastrar usuários.
                                </div>
                            )}
                        </form>
                    </div>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                        <h3 style={{ margin: '0 0 10px', color: '#1e3a5f', fontSize: '1rem' }}>Usuários existentes</h3>
                        <input
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Pesquisar por nome, e-mail, perfil ou secretaria"
                            style={{ width: '100%', marginBottom: '10px', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.82rem' }}
                        />
                        <div style={{ maxHeight: '420px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                            {filteredUsers.length === 0 ? (
                                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                                    {usersList.length === 0 ? 'Nenhum usuário carregado.' : 'Nenhum usuário encontrado para o filtro informado.'}
                                </div>
                            ) : (
                                filteredUsers.map((u) => (
                                    <div key={u.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <UserAvatar name={u.name} image={u.image} size={30} />
                                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>{u.name}</div>
                                            </div>
                                            {canCreateUser && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditUser(u)}
                                                        style={{ padding: '4px 8px', border: '1px solid #93c5fd', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={user?.id === u.id}
                                                        onClick={() => deleteUserById(u)}
                                                        style={{ padding: '4px 8px', border: '1px solid #fecaca', borderRadius: '6px', background: user?.id === u.id ? '#f8fafc' : '#fef2f2', color: user?.id === u.id ? '#94a3b8' : '#b91c1c', fontSize: '0.72rem', fontWeight: 700, cursor: user?.id === u.id ? 'not-allowed' : 'pointer' }}
                                                        title={user?.id === u.id ? 'Não é permitido excluir o próprio usuário logado.' : 'Excluir usuário'}
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{u.email}</div>
                                        <div style={{ marginTop: '4px', fontSize: '0.72rem', color: '#334155' }}>
                                            Perfil: {USER_ROLE_LABEL[resolveEffectiveRole(u.role, u.secretariat_id)] ?? u.role} | Secretaria: {secretariatName(u.secretariat_id ?? null)}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div
                style={{
                    marginTop: '18px',
                    padding: '14px 12px 18px',
                    textAlign: 'center',
                    borderTop: '1px solid #dbe3f0',
                    color: '#64748b',
                }}
            >
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', letterSpacing: '0.2px' }}>
                    SEMIT © 2026
                </div>
                <div style={{ fontSize: '0.72rem' }}>
                    Secretaria de Inovação e Tecnologia
                </div>
            </div>

            {(formMessage || formError) && (
                <div style={{ position: 'fixed', right: '12px', bottom: '12px', zIndex: 1000, maxWidth: '380px' }}>
                    {formMessage && (
                        <div style={{ background: '#ecfdf5', border: '1px solid #86efac', color: '#166534', borderRadius: '8px', padding: '10px 12px', marginTop: '8px', fontSize: '0.82rem' }}>
                            {formMessage}
                        </div>
                    )}
                    {formError && (
                        <div style={{ background: '#fff1f2', border: '1px solid #fda4af', color: '#9f1239', borderRadius: '8px', padding: '10px 12px', marginTop: '8px', fontSize: '0.82rem' }}>
                            {formError}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
