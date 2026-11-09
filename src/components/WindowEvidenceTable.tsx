import { elmiraWindowAudit } from '@/lib/window-evidence';
export function WindowEvidenceTable({ rows }: { rows: typeof elmiraWindowAudit.rooms }) {
  return <div className="mt-4">
    <h3 className="text-sm font-bold">Room window/photo evidence</h3>
    <p className="mt-1 text-xs text-muted-foreground">{rows.every(row => row.level === 'main') ? 'No upstairs proposed window scope by owner direction. Photo observations below are historical evidence only, not current work recommendations.' : 'Owner-directed basement work spots use plain W. Rooms 8, 10 and 11 remain conditional; their photo associations and opening suitability are not confirmed. No window work is claimed for room 7.'}</p>
    <p className="mt-1 text-xs text-muted-foreground">Visual screening only. Clear opening, operation and sill heights unknown; not legal egress certification. Gallery indexes are 0–29.</p>
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead><tr className="border-b border-hc-border"><th className="p-2">Room / mark</th><th className="p-2">Photo evidence</th><th className="p-2">Observation / confidence</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.room} className="border-b border-hc-border align-top">
          <td className="p-2 font-bold">{row.room} · {row.mark || 'No proposed work'}{row.conditionalNeed && <span className="font-normal"> (conditional)</span>}<br/><span className="font-normal">{row.exteriorWall} exterior</span></td>
          <td className="min-w-28 p-2">{row.photos.length ? row.photos.map(photo => <div key={photo.galleryIndex} className="mb-1"><a className="text-hc-blue underline" href={photo.assetUrl} target="_blank" rel="noreferrer">Gallery {photo.galleryIndex}</a>{' · '}<a className="text-hc-blue underline" href={photo.sourceUrl} target="_blank" rel="noreferrer">Original</a></div>) : 'No identified room photo'}</td>
          <td className="min-w-48 p-2">{row.observation}<p className="mt-1">Room match: {row.matchReasoning}</p><p className="mt-1 font-semibold">Confidence: {row.confidence}</p></td>
        </tr>)}</tbody>
      </table>
    </div>
    {rows.some(row => row.level === 'basement') && <p className="mt-2 text-xs text-muted-foreground">Room 9 estimated window allowance: $4,000, informational only. Other marked needs are conditional, not a funded scope. No automatic CapEx change.</p>}
  </div>;
}
