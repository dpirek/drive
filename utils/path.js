import path from "path";

function isInside(parent, target) {
  return target === parent || target.startsWith(`${parent}${path.sep}`);
}

export { isInside };
