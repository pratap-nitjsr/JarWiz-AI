import { createLowlight, all } from "lowlight";
import { PlateElement, PlateLeaf, type PlateElementProps, type PlateLeafProps } from "platejs/react";
import { type TCodeBlockElement } from "platejs";

const lowlight = createLowlight(all);

export function CodeBlockElementStatic(
    props: SlateElementProps<TCodeBlockElement>,
) {
    const { children, element } = props;
    const lang = element?.lang || 'plaintext';

    return (
        <PlateElement
            {...props}
            className="relative my-4 overflow-hidden rounded-md bg-muted/50 font-mono text-sm"
        >
            <div className="absolute right-2 top-2 z-10 text-xs text-muted-foreground">
                {lang}
            </div>
            <pre className="overflow-x-auto p-4">
                <code>{children}</code>
            </pre>
        </PlateElement>
    );
}

export function CodeLineElementStatic(props: PlateElementProps) {
    return (
        <PlateElement {...props} as="div" className="py-0.5">
            {props.children}
        </PlateElement>
    );
}

export function CodeSyntaxLeafStatic(props: PlateLeafProps) {
    const { leaf } = props;
    const tokenClassName = (leaf as any)?.className || '';

    return <PlateLeaf className={tokenClassName} {...props} />;
}
