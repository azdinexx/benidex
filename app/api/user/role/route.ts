import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import prisma  from "@/app/lib/prisma";

export async function GET(){

    const session = await getServerSession(authOptions);
    if (!session) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        });
    }

    const useremail = session?.user?.email 
   if (!useremail) {
        return new Response(JSON.stringify({ error: "Email not found in session" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const admin = await prisma.admin.findUnique({
        where: { email: useremail },
    })
    const userRole = admin ? "admin" : "user";
    
    return new Response(JSON.stringify({ role: userRole }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
}