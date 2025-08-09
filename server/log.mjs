export function log(...messages) {
  console.log(new Date().toISOString(), ...messages);
}
