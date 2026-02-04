import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Search, Sparkles } from 'lucide-react'
import { useForm } from '@tanstack/react-form'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { SearchResultWeb } from '@mendable/firecrawl-js'
import type { BulkScrapeProgress } from '@/data/items'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { searchSchema } from '@/schemas/import'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { bulkScrapeUrlsFn, searchWebFn } from '@/data/items'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'

export const Route = createFileRoute('/dashboard/discover')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isPending, startTransition] = useTransition()
  const [isBulkPending, startBulkTransition] = useTransition()
  const [progress, setProgress] = useState<BulkScrapeProgress | null>(null)

  const [searchResults, setSearchResults] = useState<Array<SearchResultWeb>>([])

  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())

  const form = useForm({
    defaultValues: {
      query: '',
    },
    validators: {
      onSubmit: searchSchema,
    },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        const result = await searchWebFn({
          data: {
            query: value.query,
          },
        })
        console.log('🚀 ~ RouteComponent ~ result:', result)

        setSearchResults(result)
      })
    },
  })

  const handleSelectAllUrls = () => {
    if (selectedUrls.size === searchResults.length) {
      setSelectedUrls(new Set())
    } else {
      setSelectedUrls(new Set(searchResults.map((link) => link.url)))
    }
  }

  const handleToggleUrlSelection = (url: string) => {
    const newSelectedUrls = new Set(selectedUrls)
    if (newSelectedUrls.has(url)) {
      newSelectedUrls.delete(url)
    } else {
      newSelectedUrls.add(url)
    }
    setSelectedUrls(newSelectedUrls)
  }

  const handleBulkImport = async () => {
    startBulkTransition(async () => {
      if (selectedUrls.size === 0) {
        toast.error('Please select at least one URL to import.')
        return
      }

      setProgress({
        completed: 0,
        total: selectedUrls.size,
        url: '',
        status: 'success',
      })

      let successCount = 0
      let failedCount = 0

      // await bulkScrapeUrlsFn({
      //   data: {
      //     urls: Array.from(selectedUrls),
      //   },
      // })

      for await (const update of await bulkScrapeUrlsFn({
        data: {
          urls: Array.from(selectedUrls),
        },
      })) {
        setProgress(update)

        if (update.status === 'success') {
          successCount++
        } else {
          failedCount++
        }
      }

      setProgress(null)

      if (failedCount === 0) {
        toast.success(`Successfully imported ${successCount} URLs!`)
      } else {
        toast.error(
          `Imported with some errors. Success: ${successCount}, Failed: ${failedCount}`,
        )
      }
    })
  }

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="w-full max-w-2xl space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Discover</h1>
          <p className="text-muted-foreground pt-2">
            Search the web for articles on any topic.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary" />
              Topic Search
            </CardTitle>
            <CardDescription>
              Search the web for content and import what you find interesting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup>
                <form.Field
                  name="query"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Search Query
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="e.g. JavaScript tutorials"
                          autoComplete="off"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />

                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="size-4" />
                      Search
                    </>
                  )}
                </Button>
              </FieldGroup>
            </form>

            {/* Discovered Links */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Found {searchResults.length} URLS
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllUrls}
                  >
                    {selectedUrls.size === searchResults.length
                      ? 'Deselect all'
                      : 'Select all'}
                  </Button>
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border p-4">
                  {searchResults.map((link, index) => (
                    <label
                      key={link.url + index}
                      className="hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md p-2"
                    >
                      <Checkbox
                        checked={selectedUrls.has(link.url)}
                        onCheckedChange={() =>
                          handleToggleUrlSelection(link.url)
                        }
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {link.title ?? 'Title has not been found'}
                        </p>

                        <p className="text-muted-foreground truncate text-xs">
                          {link.description ?? 'Description has not been found'}
                        </p>

                        <p className="text-muted-foreground truncate text-xs">
                          {link.url}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {progress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Importing: {`${progress.completed} / ${progress.total}`}
                      </span>
                      <span className="font-medium">
                        {Math.round(
                          (progress.completed / progress.total) * 100,
                        )}
                      </span>
                    </div>
                    <Progress
                      value={(progress.completed / progress.total) * 100}
                    />
                  </div>
                )}

                <Button
                  disabled={isBulkPending}
                  className="w-full"
                  onClick={handleBulkImport}
                  type="button"
                >
                  {isBulkPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {progress
                        ? `Importing ${progress.completed} of ${progress.total}...`
                        : 'Importing...'}
                    </>
                  ) : (
                    <>Import {selectedUrls.size} URLs</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
