import { prepareInstructions } from '../../constants';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import FileUploader from '~/components/FileUploader';
import Navbar from '~/components/Navbar';
import { convertPdfToImage } from '~/lib/pdf2img';
import { usePuterStore } from '~/lib/puter';
import { generateUUID } from '~/lib/utils';



const Upload = () => {
    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelect = (file: File | null) => {
        setFile(file);
    };
  
    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File; }) => {
        setProcessing(true);

        setStatusText('Uploading the file...');
        const uploadedFile = await fs.upload([file]);
        if (!uploadedFile) return setStatusText('Error: Failed to upload file');

        setStatusText('Converting to image...');
        const imageFile = await convertPdfToImage(file);
        if (!imageFile.file) return setStatusText('Error: Failed to convert PDF to image');

        setStatusText('Uploading the image...');
        const uploadedImage = await fs.upload([imageFile.file]);
        if (!uploadedImage) return setStatusText('Error: Failed to upload image');

        setStatusText('Preparing data...');
        const uuid = generateUUID();
        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            companyName, jobTitle, jobDescription,
            feedback: '',
        };
        await kv.set(`resume:${uuid}`, JSON.stringify(data));

        setStatusText('Analyzing...');

        const feedback = await ai.feedback(
            uploadedFile.path,
            prepareInstructions({ jobTitle, jobDescription })
        );
        if (!feedback) return setStatusText('Error: Failed to analyze resume');

        const feedbackText = typeof feedback.message.content === 'string'
            ? feedback.message.content
            : feedback.message.content[0].text;

        data.feedback = JSON.parse(feedbackText);
        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        setStatusText('Analysis complete, redirecting...');
        console.log(data);
        // navigate(`/resume/${uuid}`);
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest("form");

        if (!form) return;
        const formData = new FormData(form);
        const companyName: any = formData.get("company-name");
        const jobTitle: any = formData.get("job-title");
        const jobDescription: any = formData.get("job-description");

        if (!file) return;

        handleAnalyze({ companyName, jobTitle, jobDescription, file });
    };



    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-1">
                    <h1>Smart feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2> {statusText}</h2>
                            <img src="/images/resume-scan.gif" alt="resume-scan" className="w-full" />
                        </>)
                        :
                        (<h2> Drop your resume for an ATS score and improvement tips</h2>)}
                    {!isProcessing && (
                        <form onSubmit={handleSubmit} id="upload-form" className="flex flex-col gap-4 mt-8">
                            <div className="form-div">
                                <label htmlFor="company-name">Company Name</label>
                                <input type="text" placeholder="Company Name" id="company-name" name="company-name" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-title">Job Title</label>
                                <input type="text" placeholder="Job Title" id="job-title" name="job-title" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="job-description">Job Description</label>
                                <textarea rows={5} placeholder="Job Description" id="job-description" name="job-description" />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Upload Resume</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                            </div>

                            <button className="primary-button" type="submit"> Analyze Resume</button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    );
};

export default Upload;
