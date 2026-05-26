import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

export const fetchSummary = (currency = "USD", from, to) => {
  let url = `/analytics/summary?display_currency=${currency}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  return api.get(url).then((r) => r.data);
};

export const fetchMonthly = (currency = "USD", year, from, to) => {
  let url = `/analytics/monthly?display_currency=${currency}`;
  if (year) url += `&year=${year}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  return api.get(url).then((r) => r.data);
};

export const fetchByCategory = (type = "expense", currency = "USD", from, to) => {
  let url = `/analytics/by-category?type=${type}&display_currency=${currency}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  return api.get(url).then((r) => r.data);
};

export const fetchByVendor = (currency = "USD", params = {}) => {
  const searchParams = new URLSearchParams({ display_currency: currency, ...params });
  return api.get(`/analytics/by-vendor?${searchParams}`).then((r) => r.data);
};

export const fetchTrend = (currency = "USD", granularity = "monthly", from, to) => {
  let url = `/analytics/trend?display_currency=${currency}&granularity=${granularity}`;
  if (from) url += `&from=${from}`;
  if (to) url += `&to=${to}`;
  return api.get(url).then((r) => r.data);
};

export const fetchByCountry = (currency = "USD") =>
  api
    .get(`/analytics/by-country?display_currency=${currency}`)
    .then((r) => r.data);

export const fetchNetWorthTrend = (currency = "USD") =>
  api
    .get(`/analytics/net-worth-trend?display_currency=${currency}`)
    .then((r) => r.data);

export const fetchTransactions = (params = {}) =>
  api.get("/transactions", { params }).then((r) => r.data);

export const fetchCategories = () =>
  api.get("/transactions/categories").then((r) => r.data);

export const fetchVendors = () =>
  api.get("/transactions/vendors").then((r) => r.data);

export const createTransaction = (data) =>
  api.post("/transactions", data).then((r) => r.data);

export const updateTransaction = (id, data) =>
  api.put(`/transactions/${id}`, data).then((r) => r.data);

export const applyVendorRule = (id, applyToAll) =>
  api.put(`/transactions/${id}/apply-vendor-rule`, { applyToAll }).then((r) => r.data);

export const deleteTransaction = (id) =>
  api.delete(`/transactions/${id}`).then((r) => r.data);

export const fetchAccounts = () =>
  api.get("/accounts").then((r) => r.data);

export const createAccount = (data) =>
  api.post("/accounts", data).then((r) => r.data);

export const updateAccount = (id, data) =>
  api.put(`/accounts/${id}`, data).then((r) => r.data);

export const deleteAccount = (id) =>
  api.delete(`/accounts/${id}`).then((r) => r.data);

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const fetchUploadHistory = () =>
  api.get("/upload/history").then((r) => r.data);

export const fetchExchangeRates = () =>
  api.get("/exchange-rates").then((r) => r.data);

export const updateExchangeRate = (data) =>
  api.put("/exchange-rates", data).then((r) => r.data);

export const fetchVendorRules = () =>
  api.get("/vendor-rules").then((r) => r.data);

export const createVendorRule = (data) =>
  api.post("/vendor-rules", data).then((r) => r.data);

export const updateVendorRule = (id, data) =>
  api.put(`/vendor-rules/${id}`, data).then((r) => r.data);

export const deleteVendorRule = (id) =>
  api.delete(`/vendor-rules/${id}`).then((r) => r.data);
