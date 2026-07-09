// Allow importing static image assets. Metro resolves these to asset module
// ids (numbers) that React Native's <Image source> accepts directly.
declare module '*.png' {
  const value: number;
  export default value;
}
declare module '*.jpg' {
  const value: number;
  export default value;
}
declare module '*.jpeg' {
  const value: number;
  export default value;
}
