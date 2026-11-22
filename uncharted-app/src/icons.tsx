import Svg, { Circle, Path } from "react-native-svg";
import { C } from "./hw";

// One outline style, 2px stroke, 24px box.
type P = { size?: number; color?: string };
const box = (size: number, color: string, children: React.ReactNode) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{children}</Svg>
);

export const IconBack = ({ size = 20, color = C.ink }: P) => box(size, color, <Path d="M15 5l-7 7 7 7" />);
export const IconClose = ({ size = 20, color = C.ink }: P) => box(size, color, <Path d="M6 6l12 12M18 6L6 18" />);
export const IconPaths = ({ size = 20, color = C.ink }: P) =>
  box(size, color, <><Circle cx={6} cy={5} r={2} /><Circle cx={6} cy={19} r={2} /><Circle cx={18} cy={7} r={2} /><Path d="M6 7v10M18 9v1a5 5 0 0 1-5 5H8" /></>);
export const IconPerson = ({ size = 20, color = C.ink }: P) => box(size, color, <><Circle cx={12} cy={8} r={4} /><Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>);
export const IconMore = ({ size = 20, color = C.ink }: P) => box(size, color, <><Circle cx={5} cy={12} r={1.2} /><Circle cx={12} cy={12} r={1.2} /><Circle cx={19} cy={12} r={1.2} /></>);
export const IconSkip = ({ size = 20, color = C.ink }: P) => box(size, color, <><Circle cx={12} cy={12} r={9} /><Path d="M5.6 5.6l12.8 12.8" /></>);
export const IconFewer = ({ size = 20, color = C.ink }: P) => box(size, color, <Path d="M12 4v14M6 12l6 6 6-6" />);
