declare module "leaflet" {
  export type LatLngExpression =
    | [number, number]
    | { lat: number; lng: number }
    | { lat: number; lon: number };

  export type FitBoundsOptions = Record<string, unknown>;
  export type LatLngBoundsExpression = LatLngExpression | LatLngExpression[];

  export interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    scrollWheelZoom?: boolean;
  }

  export interface TileLayerOptions {
    attribution?: string;
  }

  export class Map {}
  export class TileLayer {}

  export type IconOptions = {
    iconUrl: string;
    iconRetinaUrl?: string;
    shadowUrl?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    popupAnchor?: [number, number];
    shadowSize?: [number, number];
  };

  export function icon(options: IconOptions): unknown;

  export namespace Marker {
    const prototype: { options: { icon: unknown } };
  }

  const L: {
    icon: typeof icon;
    Marker: typeof Marker;
  };
  export default L;
}
