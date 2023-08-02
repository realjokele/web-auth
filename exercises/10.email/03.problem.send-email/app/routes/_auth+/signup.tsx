import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import {
	json,
	type DataFunctionArgs,
	type V2_MetaFunction,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary.tsx'
import { ErrorList, Field } from '~/components/forms.tsx'
import { StatusButton } from '~/components/ui/status-button.tsx'
import { prisma } from '~/utils/db.server.ts'
import { useIsSubmitting } from '~/utils/misc.tsx'
import { emailSchema } from '~/utils/user-validation.ts'

const SignupSchema = z.object({
	email: emailSchema,
})

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const submission = await parse(formData, {
		schema: SignupSchema.superRefine(async (data, ctx) => {
			const existingUser = await prisma.user.findUnique({
				where: { email: data.email },
				select: { id: true },
			})
			if (existingUser) {
				ctx.addIssue({
					path: ['email'],
					code: z.ZodIssueCode.custom,
					message: 'A user already exists with this email',
				})
				return
			}
		}),
		acceptMultipleErrors: () => true,
		async: true,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value?.email) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}
	const { email } = submission.value

	// 🐨 send a simple email to the user's email address just to test things out.
	// 💰 replace this hard-coded response with the result from sendEmail
	const response = {
		status: 'error',
		error: `this has not yet been implemented ${email}`,
	}

	if (response.status === 'success') {
		// 🐨 if the email was sent successfully, then set the email in the session
		// under the "onboardingEmailSessionKey" key and redirect to the onboarding
		// 💰 don't forget to commit the session!
		throw new Error('todo: implement this')
	} else {
		submission.error[''] = response.error
		return json({ status: 'error', submission } as const, { status: 500 })
	}
}

export const meta: V2_MetaFunction = () => {
	return [{ title: 'Sign Up | Epic Notes' }]
}

export default function SignupRoute() {
	const actionData = useActionData<typeof action>()
	const isSubmitting = useIsSubmitting()
	const [form, fields] = useForm({
		id: 'signup-form',
		constraint: getFieldsetConstraint(SignupSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			const result = parse(formData, { schema: SignupSchema })
			return result
		},
		shouldRevalidate: 'onBlur',
	})

	return (
		<div className="container flex flex-col justify-center pb-32 pt-20">
			<div className="text-center">
				<h1 className="text-h1">Let's start your journey!</h1>
				<p className="mt-3 text-body-md text-muted-foreground">
					Please enter your email.
				</p>
			</div>
			<Form
				method="POST"
				className="mx-auto mt-16 min-w-[368px] max-w-sm"
				{...form.props}
			>
				<Field
					labelProps={{
						htmlFor: fields.email.id,
						children: 'Email',
					}}
					inputProps={{ ...conform.input(fields.email), autoFocus: true }}
					errors={fields.email.errors}
				/>
				<ErrorList errors={form.errors} id={form.errorId} />
				<StatusButton
					className="w-full"
					status={isSubmitting ? 'pending' : actionData?.status ?? 'idle'}
					type="submit"
					disabled={isSubmitting}
				>
					Submit
				</StatusButton>
			</Form>
		</div>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}