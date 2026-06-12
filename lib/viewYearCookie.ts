// Shared constant for the "viewing year" cookie. Kept in its own file (no server
// imports) so both the server helper and the client <YearPicker> can import it
// without pulling next/headers into the client bundle.
export const VIEW_YEAR_COOKIE = 'obra_view_year'
