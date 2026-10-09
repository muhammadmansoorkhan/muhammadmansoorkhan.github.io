// Public anon JWT: required by this Edge Function's JWT verification.
// This key grants no direct access to inquiry data. Never put service-role keys here.
export const inquiryEndpoint = 'https://ulxhcyetqbkpalvuxbza.supabase.co/functions/v1/portfolio-inquiry';
export const inquiryAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVseGhjeWV0cWJrcGFsdnV4YnphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODAxMDksImV4cCI6MjEwNjc1NjEwOX0.QwBjxc2CYYoIcZksaQEj0NnxFbRm1JY-QjXx9EPdpTw";
