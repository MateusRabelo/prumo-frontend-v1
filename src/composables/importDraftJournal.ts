// Emergency edit journal; immutable bank rows and upload contents stay on the server.
export function draftJournal(user: string, family: string, draft: string) {
  const key = `prumo:import-review:${user}:${family}:${draft}`;
  return {
    read(): any { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value && Number.isInteger(value.revision) && Array.isArray(value.state?.entries) ? value : null; } catch { return null; } },
    write(value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
    remove() { try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ } },
  };
}
