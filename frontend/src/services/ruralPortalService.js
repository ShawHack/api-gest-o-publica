import axios from 'axios'
import api from '../utils/api'

const BASE = '/rotas-rurais'

export async function createRuralOwner(payload) {
  const { data } = await api.post(`${BASE}/operator/owners`, payload)
  return data
}

export async function resolveRuralProperty(plusCode) {
  const { data } = await api.get(`${BASE}/operator/properties/resolve`, { params: { plusCode } })
  return data
}

function publicApi() {
  const configured = (process.env.REACT_APP_API || '/api').replace(/\/+$/, '')
  return axios.create({ baseURL: configured })
}

function ruralHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

export async function ruralLogin(username, password) {
  const { data } = await publicApi().post(`${BASE}/portal/login`, { username, password })
  return data
}

export async function changeRuralPassword(token, password) {
  const { data } = await publicApi().post(
    `${BASE}/portal/change-password`,
    { password },
    { headers: ruralHeaders(token) },
  )
  return data
}

export async function getRuralProfile(token) {
  const { data } = await publicApi().get(`${BASE}/portal/me`, { headers: ruralHeaders(token) })
  return data
}

export async function saveRuralProfile(token, payload) {
  const { data } = await publicApi().put(`${BASE}/portal/profile`, payload, {
    headers: ruralHeaders(token),
  })
  return data
}
