import { redirect } from "next/navigation";

/** For now the app opens on the Default project. Step 3 replaces this with a project picker. */
export default function Start() {
  redirect("/p/default");
}
