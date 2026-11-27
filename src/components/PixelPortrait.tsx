import { useEffect, useRef } from 'react';
import { ELF_PORTRAIT_FILE } from '../game/elfSpritesLoader';
import { MINOTAUR_PORTRAIT_FILE } from '../game/minotaurSpritesLoader';
import { NECROMANCER_PORTRAIT_FILE } from '../game/necromancerSpritesLoader';
import { NINJA_PORTRAIT_FILE } from '../game/ninjaSpritesLoader';
import { PRIEST_PORTRAIT_FILE } from '../game/priestSpritesLoader';
import { TROLL_PORTRAIT_FILE } from '../game/trollSpritesLoader';
import { JAYLON_PORTRAIT_FILE } from '../game/jaylonSpritesLoader';
import { TESLA_PORTRAIT_FILE } from '../game/teslaSpritesLoader';
import { BEELZEBU_PORTRAIT_FILE } from '../game/beelzebuSpritesLoader';
import { DONO_PORTRAIT_FILE } from '../game/donoSpritesLoader';
import { ADAO_PORTRAIT_FILE } from '../game/adaoSpritesLoader';
import { renderPortrait } from '../game/pixelSprites';
import { CharacterId } from '../game/types';

interface PixelPortraitProps {
  characterId: CharacterId;
  flip?: boolean;
  size?: number;
  fill?: boolean;
  className?: string;
}

export function PixelPortrait({
  characterId,
  flip = false,
  size = 64,
  fill = false,
  className = '',
}: PixelPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (
      characterId === 'ninja' ||
      characterId === 'elf' ||
      characterId === 'priest' ||
      characterId === 'necromancer' ||
      characterId === 'minotaur' ||
      characterId === 'troll' ||
      characterId === 'jaylon' ||
      characterId === 'tesla' ||
      characterId === 'beelzebu' ||
      characterId === 'dono' ||
      characterId === 'adao'
    ) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderPortrait(ctx, characterId, flip);
  }, [characterId, flip]);

  const imgStyle = fill
    ? { transform: flip ? 'scaleX(-1)' : undefined }
    : { width: size, height: size, transform: flip ? 'scaleX(-1)' : undefined };
  const sizeClass = fill ? 'w-full h-full' : '';

  if (characterId === 'ninja') {
    return (
      <img
        src={NINJA_PORTRAIT_FILE}
        alt="Ninja"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-top bg-[#140a0e] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'elf') {
    return (
      <img
        src={ELF_PORTRAIT_FILE}
        alt="Elfo Arqueiro"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-center pixelated bg-[#071a0e] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'priest') {
    return (
      <img
        src={PRIEST_PORTRAIT_FILE}
        alt="Sacerdote"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-top bg-[#181308] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'necromancer') {
    return (
      <img
        src={NECROMANCER_PORTRAIT_FILE}
        alt="Necromante"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-center pixelated bg-[#11081b] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'minotaur') {
    return (
      <img
        src={MINOTAUR_PORTRAIT_FILE}
        alt="Minotauro"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-top bg-[#1a0d09] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'troll') {
    return (
      <img
        src={TROLL_PORTRAIT_FILE}
        alt="Troll"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-center pixelated bg-[#071a0e] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'jaylon') {
    return (
      <img
        src={JAYLON_PORTRAIT_FILE}
        alt="Zé da Pinga"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-center pixelated bg-[#1a0818] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'tesla') {
    return (
      <img
        src={TESLA_PORTRAIT_FILE}
        alt="Nikola Tesla"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-top bg-[#091426] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'beelzebu') {
    return (
      <img
        src={BEELZEBU_PORTRAIT_FILE}
        alt="Belze"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-top bg-[#12081f] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'dono') {
    return (
      <img
        src={DONO_PORTRAIT_FILE}
        alt="Dono do Morro"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-center pixelated bg-[#1a070b] ${sizeClass} ${className}`}
      />
    );
  }

  if (characterId === 'adao') {
    return (
      <img
        src={ADAO_PORTRAIT_FILE}
        alt="Adão"
        width={size}
        height={size}
        style={imgStyle}
        className={`block object-cover object-top bg-[#1a0d12] ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      style={fill ? undefined : { width: size, height: size }}
      className={`pixelated block ${sizeClass} ${className}`}
    />
  );
}
