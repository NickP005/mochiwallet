declare const manifest: {
    manifest_version: number;
    name: string;
    version: string;
    description: string;
    action: {
        default_popup: string;
    };
    permissions: string[];
    background: {
        service_worker: string;
    };
    icons: {
        "16": string;
        "48": string;
        "128": string;
    };
};
export default manifest;
