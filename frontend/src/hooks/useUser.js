import { useEffect, useState } from "react";
import { getProfile } from "../services/api";

const readStored = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export default function useUser() {
  const [user, setUser] = useState(readStored);

  useEffect(() => {
    const id = readStored().id;
    if (!id) return;
    getProfile(id)
      .then((data) => {
        const merged = { ...readStored(), ...data, id };
        localStorage.setItem("user", JSON.stringify(merged));
        setUser(merged);
      })
      .catch(() => {});
  }, []);

  return [user, setUser];
}