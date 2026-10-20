import { getImage } from '../data';
import { href } from '../lib/router';

export function Figure({ imageId, className = '' }: { imageId?: string; className?: string }) {
  const img = getImage(imageId);
  if (!img) return null;
  return (
    <figure className={`figure ${className}`}>
      <div className="figure-frame" style={{ aspectRatio: `${img.width} / ${img.height}` }}>
        <img
          src={import.meta.env.BASE_URL + img.file}
          alt={img.alt}
          width={img.width}
          height={img.height}
          loading="lazy"
          decoding="async"
          style={img.focus ? { objectPosition: img.focus } : undefined}
        />
      </div>
      <figcaption>
        {img.title} <span className="figure-credit">· {img.creator}, {img.license.name} · <a href={href('/quellen')}>Nachweis</a></span>
      </figcaption>
    </figure>
  );
}
