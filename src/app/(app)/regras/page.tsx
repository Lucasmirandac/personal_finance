import { redirect } from "next/navigation";

export default function RegrasRedirectPage() {
  redirect("/config?tab=classificacao");
}
