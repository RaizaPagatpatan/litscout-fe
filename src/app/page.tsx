"use client"

import { useState } from "react";
import { z } from "zod";

const fieldOfStudyData = {
  "--- Not Specified ---": "",
  "Physics": "Physics",
  "Mathematics": "Mathematics",
  "Biology": "Biology",
  "Computer Science": "Computer Science",
  "Chemistry": "Chemistry",
  "Other": "Other"
}

const typeOfPublication = {
  "--- Not Specified ---": "",
  "Journal Article": "Journal Article",
  "Conference Paper": "Conference Paper",
  "Preprint": "Preprint",
  "Other": "Other"
}

const citationData = {
  "APA": "APA",
  "MLA": "MLA"
}

const databases = {
  "--- Not Specified ---": "",
  "ArXiv": "ArXiv",
  "PubMed": "PubMed",
  "OpenAIRE": "OpenAIRE",
  "Other": "Other"
}

const formSchema = z.object({
  research_topic: z.string().min(1, "Research topic is required"),
  related_topic: z.string().optional(),
  field_of_study: z.string().refine((val) => val !== "", {
    message: "Field of Study is required"
  }),
  type_of_publication: z.string().refine((val) => val !== "", {
    message: "Type of Publication is required"
  }),
  date_range: z.array(z.number()).length(2),
  keywords: z.string().optional(),
  citation_format: z.string().refine((val) => val !== "", {
    message: "Citation Format is required"
  }),
  open_access_site: z.string().refine((val) => val !== "", {
    message: "Open Access Site is required"
  })
});

type FormData = z.infer<typeof formSchema>;

export default function Home() {
  const minYear = 1900;
  const maxYear = new Date().getFullYear();
  const [startYear, setStartYear] = useState<number>(minYear);
  const [endYear, setEndYear] = useState<number>(maxYear);
  const [keyWords, setKeyWords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFetching, setIsFetching] = useState<boolean>(false)

  const [formData, setFormData] = useState<FormData>({
    research_topic: '',
    related_topic: '',
    field_of_study: '',
    type_of_publication: '',
    date_range: [minYear, maxYear],
    keywords: '',
    citation_format: '',
    open_access_site: ''
  });

  const handleAppendKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKeyword = keywordInput.trim();
    if (trimmedKeyword && !keyWords.includes(trimmedKeyword)) {
      setKeyWords(keywords => [...keywords, trimmedKeyword]);
      // Update form data with new keywords
      setFormData(prev => ({
        ...prev,
        keywords: [...keyWords, trimmedKeyword].join(', ')
      }));
    } else if (keyWords.includes(trimmedKeyword)) {
      setErrors(prev => ({ ...prev, keywords: "This keyword already exists!" }));
      setTimeout(() => {
        setErrors(prev => ({ ...prev, keywords: "" }));
      }, 3000);
    }
    setKeywordInput("");
  }

  const handleChangeYear = (year: number, dateType: string) => {
    if (dateType === "startYear") {
      setStartYear(year);
      setFormData(prev => ({
        ...prev,
        date_range: [year, prev.date_range[1]]
      }));
    } else if (dateType === "endYear") {
      setEndYear(year);
      setFormData(prev => ({
        ...prev,
        date_range: [prev.date_range[0], year]
      }));
    }

    // Validate date range
    if ((dateType === "startYear" && year > endYear) ||
      (dateType === "endYear" && year < startYear)) {
      setErrors(prev => ({ ...prev, date_range: "End year must be greater than or equal to Start Year" }));
    } else {
      setErrors(prev => ({ ...prev, date_range: "" }));
    }
  }

  const handleDeleteKeyword = (keywordToDelete: string) => {
    const newKeywords = keyWords.filter(keyword => keyword !== keywordToDelete);
    setKeyWords(newKeywords);
    setFormData(prev => ({
      ...prev,
      keywords: newKeywords.join(', ')
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateField = (field: keyof FormData): boolean => {
    try {
      // Create a partial schema for just this field
      const fieldSchema = z.object({ [field]: formSchema.shape[field] });
      fieldSchema.parse({ [field]: formData[field] });
      setErrors(prev => ({ ...prev, [field]: "" }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => err.path[0] === field)?.message;
        setErrors(prev => ({ ...prev, [field]: fieldError || "" }));
        return false;
      }
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: FormData = {
      ...formData,
      date_range: [startYear, endYear],
      keywords: keyWords.join(', ')
    };

    try {
      // Validate all fields at once
      formSchema.parse(data);
      setIsFetching(true)
      // If validation passes, send data to API
      const response = await fetch("http://127.0.0.1:5000/generate_report", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        setIsFetching(false)
        throw new Error('Network response was not ok');
      }

      setIsFetching(false)

      const result = await response.json();
      console.log('Success:', result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Create an object with all errors
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as string;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      } else {
        console.error('Error:', error);
      }
    }
  };

  return (
    <main className="flex flex-col text-[#FEFEFE] py-[5rem] justify-center items-start w-[60rem] mx-auto">
      <h1 className="text-[4rem] text-bold">Litscout</h1>
      <h2 className="text-[2.5rem] text-semibold">Related Literature LLM Tool for Researchers</h2>
      <form onSubmit={handleSubmit} className="space-y-3 w-full">
        <div className="space-y-2 flex flex-col">
          <label htmlFor="research-topic">Research Topic *</label>
          <input
            placeholder="ex: Machine Learning (Not Machine Learning for Eyes) - this must be vague to handle a lot of data"
            className="bg-[#3A3A3A] border-1 border-[#3A3A3A] rounded-[4px] py-2 px-4"
            type="text"
            id="research-topic"
            name="research-topic"
            value={formData.research_topic}
            onChange={(e) => handleInputChange('research_topic', e.target.value)}
            onBlur={() => validateField('research_topic')}
          />
          {errors.research_topic && (
            <span className="text-red-500 text-sm">{errors.research_topic}</span>
          )}
        </div>

        <div className="space-y-2 flex flex-col">
          <label htmlFor="related-topic">Related Topic</label>
          <input
            placeholder="(Optional) Subtopic"
            className="bg-[#3A3A3A] border-1 border-[#3A3A3A] rounded-[4px] py-2 px-4"
            type="text"
            id="related-topic"
            name="related-topic"
            value={formData.related_topic}
            onChange={(e) => handleInputChange('related_topic', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-[4rem]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="field-study">Field of Study *</label>
              <select
                id="field-study"
                name="field-study"
                className="w-full p-2 border rounded-md bg-[#3A3A3A]"
                value={formData.field_of_study}
                onChange={(e) => handleInputChange('field_of_study', e.target.value)}
                onBlur={() => validateField('field_of_study')}
              >
                {Object.entries(fieldOfStudyData).map(([label, value]) => (
                  <option className="bg-[#1E1E1E]" key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.field_of_study && (
                <span className="text-red-500 text-sm">{errors.field_of_study}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="type-publication">Type of Publication *</label>
              <select
                id="type-publication"
                name="type-publication"
                className="w-full p-2 border rounded-md bg-[#3A3A3A]"
                value={formData.type_of_publication}
                onChange={(e) => handleInputChange('type_of_publication', e.target.value)}
                onBlur={() => validateField('type_of_publication')}
              >
                {Object.entries(typeOfPublication).map(([label, value]) => (
                  <option className="bg-[#1E1E1E] pr-4" key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.type_of_publication && (
                <span className="text-red-500 text-sm">{errors.type_of_publication}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="citation-data">Citation Format *</label>
              <select
                id="citation-data"
                name="citation-data"
                className="w-full p-2 border rounded-md bg-[#3A3A3A]"
                value={formData.citation_format}
                onChange={(e) => handleInputChange('citation_format', e.target.value)}
                onBlur={() => validateField('citation_format')}
              >
                {Object.entries(citationData).map(([label, value]) => (
                  <option className="bg-[#1E1E1E] pr-4" key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.citation_format && (
                <span className="text-red-500 text-sm">{errors.citation_format}</span>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label>Date Range</label>
              <div className="flex flex-col gap-2 w-full max-w-md">
                <div className="flex justify-between text-sm">
                  <span>Minimum Year: {minYear}</span>
                  <span>Maximum Year: {maxYear}</span>
                </div>
                <div className="grid grid-cols-2 gap-[4rem]">
                  <div className="flex flex-col gap-4">
                    <label htmlFor="start-year">Start Year</label>
                    <input
                      className="bg-[#3A3A3A] border-1 border-[#3A3A3A] rounded-[4px] py-2 px-4"
                      type="number"
                      id="start-year"
                      name="start-year"
                      value={startYear}
                      onChange={(e) => handleChangeYear(Number(e.target.value), "startYear")}
                      min={minYear}
                      max={maxYear}
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <label htmlFor="end-year">End Year</label>
                    <input
                      className="bg-[#3A3A3A] border-1 border-[#3A3A3A] rounded-[4px] py-2 px-4"
                      type="number"
                      id="end-year"
                      name="end-year"
                      value={endYear}
                      onChange={(e) => handleChangeYear(Number(e.target.value), "endYear")}
                      min={minYear}
                      max={maxYear}
                    />
                  </div>
                </div>
                {errors.date_range && (
                  <span className="text-red-500 text-sm">{errors.date_range}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="database">Choose Database *</label>
              <select
                id="database"
                name="database"
                className="w-full p-2 border rounded-md bg-[#3A3A3A]"
                value={formData.open_access_site}
                onChange={(e) => handleInputChange('open_access_site', e.target.value)}
                onBlur={() => validateField('open_access_site')}
              >
                {Object.entries(databases).map(([label, value]) => (
                  <option className="bg-[#1E1E1E] pr-4" key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.open_access_site && (
                <span className="text-red-500 text-sm">{errors.open_access_site}</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 flex flex-col">
          <label htmlFor="keywords">Keywords</label>
          <input
            className="bg-[#3A3A3A] border-1 border-[#3A3A3A] rounded-[4px] py-2 px-4"
            type="text"
            placeholder="Add here specific keywords: ex: Eyes"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {keyWords.length > 0 && keyWords.map(keyword => (
              <div key={keyword} className="flex items-center gap-2 bg-[#3A3A3A] px-3 py-1 rounded-md">
                <span>{keyword}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteKeyword(keyword)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAppendKeyword}
            className="bg-[#3A3A3A] px-4 py-2 rounded-md hover:bg-[#4A4A4A]"
          >
            Append
          </button>
          {errors.keywords && (
            <span className="text-red-500 text-sm">{errors.keywords}</span>
          )}
        </div>

        <div className="mt-8 mb-12 flex justify-center">
          <button
            type="submit"
            disabled={isFetching}
            className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg transition-all duration-200 hover:shadow-xl ${isFetching ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isFetching ? 'Loading...' : 'Submit'}
          </button>
        </div>
      </form>
    </main>
  );
}