"use client";
import { Appbar } from "@/components/Appbar";
import { CheckFeature } from "@/components/CheckFeature";
import { Inputs } from "@/components/Inputs";
import { PrimaryButton } from "@/components/buttons/PrimaryButton";


export default function () {
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
                <div className="flex-1 pt-6 pb-6 mt-12 rounded px-4 border">
                    <Inputs label={"Name"} onChange={e => {

                    }} type="text" placeholder="Your name"></Inputs>
                    <Inputs label={"Email"} onChange={e => {

                    }} type="text" placeholder="Your email"></Inputs>
                    <Inputs label={"Password"} onChange={e => {

                    }} type="password" placeholder="Password"></Inputs>
                    <div className="pt-4">
                        <PrimaryButton onClick={() => {

                        }} size="big">Get Started Free</PrimaryButton>
                    </div>
                </div>
            </div>
        </div>
    </div>
}