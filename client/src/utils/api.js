import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

export const fetchSummary = (currency = "USD") =>
  api.get(`/analytics/summary?display_currency=${currency}`).then((r) => r.data);

export const fetchMonthly = (currency = "USD", year) => {
  let url = `/analytics/monthly?display_currency=${currency}`;
  if (year) url += `&year=${year}`;
  return api.get(url).then((r) => r.data);
};

export const fetchByCategory = (type = "expense", currency = "USD") =>
  api
    .get(`/analytics/by-category?type=${type}&display_currency=${currency}`)
    .then((r) => r.data);

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

export const createTransaction = (data) =>
  api.post("/transactions", data).then((r) => r.data);

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
