"use client";
import { Appbar } from "@/components/Appbar";
import { CheckFeature } from "@/components/CheckFeature";
import { Inputs } from "@/components/Inputs";
import { PrimaryButton } from "@/components/buttons/PrimaryButton";
import { useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { useRouter } from "next/navigation";


export default function () {
    const router = useRouter();
    const [email, setEmail]= useState("");
    const [password, setPassword]= useState("");
    return <div>
        <Appbar />
        <div className="flex justify-center">
            <div className="flex pt-8 max-w-4xl">
                <div className="flex-1 pt-20 px-4">
                    <div className="font-semibold text-3xl pb-4">
                        Join millions worldwide who automate their work using Integrator.
                    </div>
                    <div className="pb-6 pt-4">
                        <CheckFeature label={"Easy setup, no coding required"} />
                    </div>
                    <div className="pb-6">
                        <CheckFeature label={"Free forever for core features"} />
                    </div>
                    <div className="pb-6">
                        <CheckFeature label={"14-day trial of premium features & apps"} />
                    </div>
                </div>
                <div className="flex-1 pt-6 pb-6 mt-12 px-4 h-fit rounded border">
                    <Inputs label={"Email"} onChange={e => {
                        setEmail(e.target.value);
                    }} type="text" placeholder="Your email"></Inputs>
                    <Inputs label={"Password"} onChange={e => {
                        setPassword(e.target.value);
                    }} type="password" placeholder="Password"></Inputs>
                    <div className="pt-4">
                        <PrimaryButton onClick={async () => {
                            const response = await axios.post(`${BACKEND_URL}/api/v1/user/signin`, {
                                username: email,
                                password
                            });
                            localStorage.setItem("token" , response.data.token);
                            router.push("/dashboard");
                        }} size="big">Login</PrimaryButton>
                    </div>
                </div>
            </div>
        </div>
    </div>
}