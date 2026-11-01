/** Prompts use the user's supplied Arks PS4 UI pack; gamepad mappings live in WorldView. */
export function ControllerLegend({ driving = false, connected = false }: { driving?: boolean; connected?: boolean }) {
  const prompts = driving
    ? [{ icon: "left-stick", label: "steer / drive" }, { icon: "d-pad", label: "steer / drive" }, { icon: "circle", label: "brake" }]
    : [{ icon: "left-stick", label: "move" }, { icon: "d-pad", label: "move" }, { icon: "cross", label: "interact" }, { icon: "square", label: "jump" }];
  return <span className="flex max-w-sm flex-wrap items-center gap-x-3 gap-y-1" aria-label={connected ? "Controller connected" : "Controller controls"}>
    <span className="text-[10px] font-bold text-current/75">{connected ? "Controller connected" : "Controller"}</span>
    {prompts.map(({ icon, label }) => <span key={icon} className="inline-flex items-center gap-1 whitespace-nowrap">
      <img src={`/game-controls/ps4/${icon}.svg`} alt={icon.replaceAll("-", " ")} className="size-5 object-contain" /> {label}
    </span>)}
  </span>;
}
