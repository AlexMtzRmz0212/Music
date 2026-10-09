import { CaretDownIcon } from "@phosphor-icons/react";
import { Tile } from "../components/Showcase";
import { SCENES } from "./scenes";
import { useWorld } from "./world";

const albumsLabel = (n) => `${n} album${n === 1 ? "" : "s"}`;

// One realm of the descent: its band of scenery, then a header that opens and closes it (an accordion), then its
// albums. Closed, a realm is just its scenery and a count, so the whole world can fold into a short map.
// `tones` are the colours this realm fades between: from the realm above, its own, towards the one below.
export default function Realm({ realm, open, onToggle, onOpen, filtering, tones, sectionRef }) {
  const { petted } = useWorld();
  const Scenery = SCENES[realm.id];
  const shown = realm.albums.length;
  const count = filtering ? `${shown} of ${albumsLabel(realm.total)}` : albumsLabel(realm.total);
  const line = realm.id === "hades" && petted ? "Cerberus lets you pass." : realm.line;

  return (
    <section
      ref={sectionRef}
      id={`realm-${realm.id}`}
      className={`realm realm-${realm.id} tone-${realm.tone}${open ? "" : " closed"}`}
      style={{ "--prev": tones.prev, "--color": tones.color, "--next": tones.next }}
      aria-labelledby={`realm-${realm.id}-name`}
    >
      {Scenery && <Scenery />}
      <h2 className="realm-head">
        <button aria-expanded={open} aria-controls={`realm-${realm.id}-albums`} onClick={onToggle}>
          <span className="realm-title">
            <span className="realm-name" id={`realm-${realm.id}-name`}>
              {realm.name}
            </span>
            <span className="realm-line">{line}</span>
          </span>
          <span className="realm-count">{count}</span>
          <CaretDownIcon className="realm-caret" aria-hidden="true" />
        </button>
      </h2>
      <div className="realm-body" id={`realm-${realm.id}-albums`} inert={!open || undefined}>
        <div className="realm-inner">
          {shown === 0 ? (
            <p className="realm-empty">{realm.total === 0 ? "Nobody here yet." : "No albums here match."}</p>
          ) : (
            <ul className={realm.plaques ? "sc-hall" : "sc-grid"}>
              {realm.albums.map((album, i) => (
                <li key={album.id} id={`album-${album.id}`}>
                  <Tile album={album} big={realm.plaques} eager={realm.plaques || i < 8} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
