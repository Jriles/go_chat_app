export type User = {
    name:string
    email:string
    id:string
}

// Derived from the hostname the page was loaded from, so the same build
// works whether it's opened via localhost or another machine's LAN IP —
// no rebuild needed if the server's address changes.
export const API_BASE_URL = `http://${window.location.hostname}:8080`
export const WS_BASE_URL = `ws://${window.location.hostname}:8080`
